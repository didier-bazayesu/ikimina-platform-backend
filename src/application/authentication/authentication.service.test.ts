import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { createPasswordHasherMock } from './password-hasher.mock';
import { createUserRepositoryMock } from './user.repository.mock';
import { TokenHasherMock } from './token-hasher.mock';
import { RefreshTokenRepositoryMock } from './refresh-token.repository.mock';
import type { PasswordHasherInterface } from './password-hasher.interface';
import type { UserRepositoryInterface } from './user.repository.interface';

const ACCESS_SECRET = 'access-secret-that-is-at-least-32-characters';
const REFRESH_SECRET = 'refresh-secret-that-is-at-least-32-characters';

class ConfigServiceStub {
  get(key: string): unknown {
    if (key === 'JWT_ACCESS_SECRET') return ACCESS_SECRET;
    if (key === 'JWT_REFRESH_SECRET') return REFRESH_SECRET;
    if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
    return '7d';
  }
}

const activeUser = {
  id: 'user-1',
  email: 'member@example.com',
  phone: '+250780000000',
  passwordHash: 'current-hash',
  role: 'MEMBER' as const,
  status: 'ACTIVE' as const,
  joinedDate: new Date(),
  createdAt: new Date(),
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userRepository: UserRepositoryInterface;
  let passwordHasher: PasswordHasherInterface;
  let tokenHasher: TokenHasherMock;
  let refreshTokenRepository: RefreshTokenRepositoryMock;
  let jwtService: JwtService;

  beforeEach(() => {
    userRepository = createUserRepositoryMock();
    passwordHasher = createPasswordHasherMock();
    tokenHasher = new TokenHasherMock();
    refreshTokenRepository = new RefreshTokenRepositoryMock();
    jwtService = new JwtService({});
    service = new AuthenticationService(
      userRepository,
      passwordHasher,
      tokenHasher,
      refreshTokenRepository,
      jwtService,
      new ConfigServiceStub() as never,
    );
  });

  describe('refresh', () => {
    it('issues a new access token for an active user', async () => {
      vi.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);
      const refreshToken = await jwtService.signAsync(
        { sub: activeUser.id, role: activeUser.role },
        { secret: REFRESH_SECRET, expiresIn: '7d' },
      );
      await refreshTokenRepository.create(
        activeUser.id,
        tokenHasher.hash(refreshToken),
        new Date(Date.now() + 60_000),
      );

      const result = await service.refresh(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(refreshTokenRepository.tokens[0]?.revokedAt).not.toBeNull();
      await expect(
        jwtService.verifyAsync(result.accessToken, { secret: ACCESS_SECRET }),
      ).resolves.toMatchObject({ sub: activeUser.id, role: activeUser.role });
    });

    it.each(['SUSPENDED', 'EXITED'] as const)(
      'rejects a refresh token for a %s user',
      async (status) => {
        vi.spyOn(userRepository, 'findById').mockResolvedValue({
          ...activeUser,
          status,
        });
        const refreshToken = await jwtService.signAsync(
          { sub: activeUser.id, role: activeUser.role },
          { secret: REFRESH_SECRET, expiresIn: '7d' },
        );

        await expect(service.refresh(refreshToken)).rejects.toThrow(
          UnauthorizedException,
        );
      },
    );

    it('rejects an invalid or expired refresh token', async () => {
      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('revokes every member token when a refresh token is replayed', async () => {
      const refreshToken = await jwtService.signAsync(
        { sub: activeUser.id, role: activeUser.role },
        { secret: REFRESH_SECRET, expiresIn: '7d' },
      );
      await refreshTokenRepository.create(
        activeUser.id,
        'hashed:some-other-token',
        new Date(Date.now() + 60_000),
      );
      vi.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenRepository.tokens[0]?.revokedAt).not.toBeNull();
    });

    it('rejects an expired active database token', async () => {
      const refreshToken = await jwtService.signAsync(
        { sub: activeUser.id, role: activeUser.role },
        { secret: REFRESH_SECRET, expiresIn: '7d' },
      );
      await refreshTokenRepository.create(
        activeUser.id,
        tokenHasher.hash(refreshToken),
        new Date(Date.now() - 1_000),
      );
      vi.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes only the requested refresh token by default', async () => {
      const refreshToken = await jwtService.signAsync(
        { sub: activeUser.id, role: activeUser.role },
        { secret: REFRESH_SECRET, expiresIn: '7d' },
      );
      await refreshTokenRepository.create(
        activeUser.id,
        tokenHasher.hash(refreshToken),
        new Date(Date.now() + 60_000),
      );
      const otherToken = await refreshTokenRepository.create(
        activeUser.id,
        'hashed:other-token',
        new Date(Date.now() + 60_000),
      );

      await service.logout(refreshToken);

      expect(refreshTokenRepository.tokens[0]?.revokedAt).not.toBeNull();
      expect(otherToken.revokedAt).toBeNull();
    });

    it('revokes all refresh tokens when allDevices is true', async () => {
      const refreshToken = await jwtService.signAsync(
        { sub: activeUser.id, role: activeUser.role },
        { secret: REFRESH_SECRET, expiresIn: '7d' },
      );
      await refreshTokenRepository.create(
        activeUser.id,
        tokenHasher.hash(refreshToken),
        new Date(Date.now() + 60_000),
      );
      await refreshTokenRepository.create(
        activeUser.id,
        'hashed:other-token',
        new Date(Date.now() + 60_000),
      );

      await service.logout(refreshToken, true);

      expect(
        refreshTokenRepository.tokens.every((token) => token.revokedAt),
      ).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('updates the hash when the current password is correct', async () => {
      vi.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);

      await service.changePassword(
        activeUser.id,
        'old-password',
        'new-password',
      );

      expect(passwordHasher.hash).toHaveBeenCalledWith('new-password');
      expect(userRepository.updatePasswordHash).toHaveBeenCalledWith(
        activeUser.id,
        'hashed-password',
      );
      expect(refreshTokenRepository.tokens).toHaveLength(0);
    });

    it('rejects an incorrect current password without updating the hash', async () => {
      vi.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);
      vi.spyOn(passwordHasher, 'verify').mockResolvedValue(false);

      await expect(
        service.changePassword(activeUser.id, 'wrong-password', 'new-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the current password', async () => {
      await expect(
        service.changePassword(activeUser.id, 'same-password', 'same-password'),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.findById).not.toHaveBeenCalled();
    });
  });
});
