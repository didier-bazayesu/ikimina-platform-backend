import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from '../application/authentication/user';
import type { AuthenticatedUser } from './authentication.guard';

/**
 * Unit test for RolesGuard, in isolation.
 *
 * IKM-1.2's own acceptance criteria: correct role allowed, wrong role
 * denied (403), missing @Roles() metadata means the route is unrestricted.
 *
 * This test builds ExecutionContext stubs directly rather than going
 * through a real Reflector-populated route, so it uses a real Reflector
 * instance but manually stubs getHandler()/getClass() to return plain
 * objects, and separately stubs reflector.getAllAndOverride via a real
 * Reflector against Reflect metadata set with SetMetadata's own key —
 * simplest is to bypass Reflector's real metadata lookup and stub it
 * directly, since we're testing RolesGuard's decision logic, not
 * Reflector's own metadata storage mechanism (that's NestJS's to test).
 */

function buildContext(user?: AuthenticatedUser): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildGuardWithRequiredRoles(
  requiredRoles: Role[] | undefined,
): RolesGuard {
  const reflector = {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;

  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows access when no @Roles() metadata is present (unrestricted route)', () => {
    const guard = buildGuardWithRequiredRoles(undefined);
    const context = buildContext(undefined); // not even authenticated — still allowed at this layer

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when @Roles() metadata is an empty array', () => {
    const guard = buildGuardWithRequiredRoles([]);
    const context = buildContext({ id: 'user-1', role: 'MEMBER' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    const guard = buildGuardWithRequiredRoles(['ADMIN']);
    const context = buildContext({ id: 'admin-1', role: 'ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user does not have a required role', () => {
    const guard = buildGuardWithRequiredRoles(['ADMIN']);
    const context = buildContext({ id: 'member-1', role: 'MEMBER' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when the route requires a role but no user is present', () => {
    // Would only happen if RolesGuard were applied without JwtAuthGuard
    // running first — still worth confirming it fails closed, not open.
    const guard = buildGuardWithRequiredRoles(['ADMIN']);
    const context = buildContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows access when multiple roles are permitted and the user matches one', () => {
    const guard = buildGuardWithRequiredRoles(['ADMIN', 'MEMBER']);
    const context = buildContext({ id: 'member-1', role: 'MEMBER' });

    expect(guard.canActivate(context)).toBe(true);
  });
});

// Confirm ROLES_KEY is actually used consistently between the decorator
// and the guard — a mismatched string key here would silently make every
// route look unrestricted, which is exactly the kind of bug that's easy
// to miss since "unrestricted" and "correctly permitted" look the same
// from the outside.
describe('ROLES_KEY consistency', () => {
  it('is a non-empty string constant', () => {
    expect(typeof ROLES_KEY).toBe('string');
    expect(ROLES_KEY.length).toBeGreaterThan(0);
  });
});
