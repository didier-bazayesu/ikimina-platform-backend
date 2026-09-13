import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvConfig } from '../config/env.schema';
import type { Role } from '../application/authentication/user';
export interface AuthenticatedUser {
  id: string;
  role: Role;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No access token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: Role;
      }>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      // Covers expired, malformed, and invalid-signature tokens alike —
      // per IKM-1.4's own acceptance criteria, all three are just 401.
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim();
  }
}
