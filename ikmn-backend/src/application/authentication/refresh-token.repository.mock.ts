import type { RefreshToken } from './refresh-token';
import type { RefreshTokenRepositoryInterface } from './refresh-token.repository.interface';

export class RefreshTokenRepositoryMock implements RefreshTokenRepositoryInterface {
  public readonly tokens: RefreshToken[] = [];
  private idCounter = 0;

  async create(
    memberId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    const token: RefreshToken = {
      id: `token-${++this.idCounter}`,
      memberId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    this.tokens.push(token);
    return token;
  }

  async findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    return (
      this.tokens.find(
        (token) => token.tokenHash === tokenHash && !token.revokedAt,
      ) ?? null
    );
  }

  async revokeById(id: string): Promise<void> {
    const token = this.tokens.find((candidate) => candidate.id === id);
    if (token) token.revokedAt = new Date();
  }

  async revokeAllForMember(memberId: string): Promise<void> {
    this.tokens
      .filter((token) => token.memberId === memberId && !token.revokedAt)
      .forEach((token) => {
        token.revokedAt = new Date();
      });
  }

  async rotate(
    oldTokenId: string,
    memberId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<RefreshToken> {
    await this.revokeById(oldTokenId);
    return this.create(memberId, newTokenHash, newExpiresAt);
  }
}
