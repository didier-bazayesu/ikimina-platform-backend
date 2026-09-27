import { Inject, Injectable } from '@nestjs/common';
import type { RefreshTokenRepositoryInterface } from '../application/authentication/refresh-token.repository.interface';
import type { RefreshToken } from '../application/authentication/refresh-token';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';

interface RefreshTokenRow {
  id: string;
  member_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

function toDomain(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    memberId: row.member_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(
    memberId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    const rows = await this.db.query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (member_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [memberId, tokenHash, expiresAt],
    );
    return toDomain(rows[0]);
  }

  async findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    const rows = await this.db.query<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async revokeById(id: string): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens
       SET revoked_at = now()
       WHERE id = $1 AND revoked_at IS NULL`,
      [id],
    );
  }

  async revokeAllForMember(memberId: string): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens
       SET revoked_at = now()
       WHERE member_id = $1 AND revoked_at IS NULL`,
      [memberId],
    );
  }

  async rotate(
    oldTokenId: string,
    memberId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<RefreshToken> {
    return this.db.transaction(async (query) => {
      await query(
        `UPDATE refresh_tokens
         SET revoked_at = now()
         WHERE id = $1 AND revoked_at IS NULL`,
        [oldTokenId],
      );
      const rows = await query<RefreshTokenRow>(
        `INSERT INTO refresh_tokens (member_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [memberId, newTokenHash, newExpiresAt],
      );
      return toDomain(rows[0]);
    });
  }
}
