import type { RefreshToken } from './refresh-token';

export interface RefreshTokenRepositoryInterface {
  create(
    memberId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshToken>;
  findActiveByHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeById(id: string): Promise<void>;
  revokeAllForMember(memberId: string): Promise<void>;
  rotate(
    oldTokenId: string,
    memberId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<RefreshToken>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
