import { describe, it, expect, beforeAll } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './authentication.guard';

/**
 * Unit test for JwtAuthGuard, in isolation — no real HTTP route needed.
 *
 * IKM-1.4's own acceptance criteria: valid token → request.user populated;
 * missing token → 401; expired or malformed token → 401.
 *
 * End-to-end proof (a real HTTP request through a real protected route)
 * is deliberately deferred to Sprint 2's first @UseGuards(JwtAuthGuard)
 * endpoint — see authentication.controller.integration-test.ts's note.
 * This test proves the guard's own logic is correct in the meantime.
 *
 * JwtService is used for real here (not mocked) — signing/verifying is
 * cheap, stateless, and has no external dependency (no DB, no network),
 * so there's no reason to fake it; doing so would only reduce confidence
 * that the guard's actual crypto verification logic works.
 */

// Minimal stub — JwtAuthGuard only ever calls .get('JWT_ACCESS_SECRET', ...)
class ConfigServiceStub {
  get(key: string): unknown {
    if (key === 'JWT_ACCESS_SECRET') return TEST_SECRET;
    return undefined;
  }
}

const TEST_SECRET = 'test-secret-at-least-32-characters-long-ok';
const WRONG_SECRET = 'a-completely-different-secret-value-here';

function buildContext(authorizationHeader?: string): ExecutionContext {
  const request = {
    headers: authorizationHeader ? { authorization: authorizationHeader } : {},
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let jwtService: JwtService;
  let guard: JwtAuthGuard;

  beforeAll(() => {
    jwtService = new JwtService({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guard = new JwtAuthGuard(jwtService, new ConfigServiceStub() as any);
  });

  it('throws 401 when no Authorization header is present', async () => {
    const context = buildContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'No access token provided',
    );
  });

  it('throws 401 when the Authorization header is malformed (no Bearer prefix)', async () => {
    const context = buildContext('NotBearer sometoken');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'No access token provided',
    );
  });

  it('throws 401 for a garbage token that fails to parse', async () => {
    const context = buildContext('Bearer not-a-real-jwt');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired access token',
    );
  });

  it('throws 401 for a token signed with the wrong secret', async () => {
    const forgedToken = await jwtService.signAsync(
      { sub: 'user-1', role: 'MEMBER' },
      { secret: WRONG_SECRET, expiresIn: '15m' },
    );
    const context = buildContext(`Bearer ${forgedToken}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired access token',
    );
  });

  it('throws 401 for an expired token', async () => {
    const expiredToken = await jwtService.signAsync(
      { sub: 'user-1', role: 'MEMBER' },
      { secret: TEST_SECRET, expiresIn: '-1s' }, // already expired at issuance
    );
    const context = buildContext(`Bearer ${expiredToken}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired access token',
    );
  });

  it('returns true and populates request.user for a valid token', async () => {
    const validToken = await jwtService.signAsync(
      { sub: 'user-1', role: 'ADMIN' },
      { secret: TEST_SECRET, expiresIn: '15m' },
    );

    const request = { headers: { authorization: `Bearer ${validToken}` } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect((request as { user?: { id: string; role: string } }).user).toEqual({
      id: 'user-1',
      role: 'ADMIN',
    });
  });
});
