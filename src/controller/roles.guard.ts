import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../application/authentication/user';
import type { AuthenticatedUser } from './authentication.guard';
import { ROLES_KEY } from './roles.decorator';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() metadata on this route means it has no role
    // restriction — JwtAuthGuard (if also applied) still governs
    // whether the caller is authenticated at all.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Returning false here triggers NestJS's built-in ForbiddenException
    // (403), which HttpExceptionFilter then formats — assuming that path
    // is actually confirmed working, which we haven't verified yet (see
    // the still-open IKM-1.3 curl checks).
    return !!user && requiredRoles.includes(user.role);
  }
}
