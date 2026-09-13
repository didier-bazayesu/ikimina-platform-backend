import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import type {
  AuthenticationServiceInterface,
  LoginResult,
  TokenPair,
} from './authentication.service.interface';
import type { UserRepositoryInterface } from './user.repository.interface';
import { USER_REPOSITORY } from './user.repository.interface';
import type { PasswordHasherInterface } from './password-hasher.interface';
import { PASSWORD_HASHER } from './password-hasher.interface';
import type { TokenHasherInterface } from './token-hasher.interface';
import { TOKEN_HASHER } from './token-hasher.interface';
import type { RefreshTokenRepositoryInterface } from './refresh-token.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './refresh-token.repository.interface';
import type { EnvConfig } from 'src/config/env.schema';
import type { StringValue } from 'ms';
import type { Role } from './user';
@Injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherInterface,
    @Inject(TOKEN_HASHER)
    private readonly tokenHasher: TokenHasherInterface,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryInterface,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordHasher.verify(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    const tokens = await this.issueTokenPair(user.id, user.role);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.tokenHasher.hash(refreshToken);
    const existing =
      await this.refreshTokenRepository.findActiveByHash(tokenHash);

    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!existing) {
      await this.refreshTokenRepository.revokeAllForMember(payload.sub);
      throw new UnauthorizedException(
        'Refresh token is invalid or has already been used',
      );
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const newRefreshToken = await this.signToken(
      payload.sub,
      payload.role,
      'refresh',
    );
    await this.refreshTokenRepository.rotate(
      existing.id,
      payload.sub,
      this.tokenHasher.hash(newRefreshToken),
      this.expiryDateFor('JWT_REFRESH_EXPIRES_IN'),
    );

    const accessToken = await this.signToken(payload.sub, user.role, 'access');
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string, allDevices = false): Promise<void> {
    let payload: { sub: string; role: Role };

    try {
      payload = await this.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    if (allDevices) {
      await this.refreshTokenRepository.revokeAllForMember(payload.sub);
      return;
    }

    const existing = await this.refreshTokenRepository.findActiveByHash(
      this.tokenHasher.hash(refreshToken),
    );
    if (existing) {
      await this.refreshTokenRepository.revokeById(existing.id);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const currentMatches = await this.passwordHasher.verify(
      currentPassword,
      user.passwordHash,
    );
    if (!currentMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const newHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updatePasswordHash(userId, newHash);
    await this.refreshTokenRepository.revokeAllForMember(userId);
  }

  private async issueTokenPair(userId: string, role: Role): Promise<TokenPair> {
    const accessToken = await this.signToken(userId, role, 'access');
    const refreshToken = await this.signToken(userId, role, 'refresh');

    await this.refreshTokenRepository.create(
      userId,
      this.tokenHasher.hash(refreshToken),
      this.expiryDateFor('JWT_REFRESH_EXPIRES_IN'),
    );

    return { accessToken, refreshToken };
  }

  private async signToken(
    sub: string,
    role: Role,
    kind: 'access' | 'refresh',
  ): Promise<string> {
    const secretKey =
      kind === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';
    const expiresKey =
      kind === 'access' ? 'JWT_ACCESS_EXPIRES_IN' : 'JWT_REFRESH_EXPIRES_IN';

    return this.jwtService.signAsync(
      { sub, role },
      {
        secret: this.configService.get(secretKey, { infer: true }),
        expiresIn: this.configService.get(expiresKey, {
          infer: true,
        }) as StringValue,
      },
    );
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<{ sub: string; role: Role }> {
    try {
      return await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token is invalid or has expired',
      );
    }
  }

  private expiryDateFor(key: 'JWT_REFRESH_EXPIRES_IN'): Date {
    const raw = this.configService.get(key, { infer: true }) as StringValue;
    return new Date(Date.now() + ms(raw));
  }
}
