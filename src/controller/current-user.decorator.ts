import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './authentication.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
