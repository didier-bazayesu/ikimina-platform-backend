import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './authentication.guard';

@Injectable()
export class JwtAuthGuardMock implements CanActivate {
  constructor(private readonly user: AuthenticatedUser) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = this.user;
    return true;
  }
}
