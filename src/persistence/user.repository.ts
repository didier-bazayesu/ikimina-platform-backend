import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import {
  CreateUserInput,
  UserRepositoryInterface,
} from '../application/authentication/user.repository.interface';
import { User, UserStatus } from '../application/authentication/user';

interface UserRow {
  id: string;
  email: string;
  phone: string;
  password_hash: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'EXITED';
  joined_date: string;
  created_at: string;
}

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    joinedDate: new Date(row.joined_date),
    createdAt: new Date(row.created_at),
  };
}

@Injectable()
export class UserRepository implements UserRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const rows = await this.db.query<UserRow>(
      `INSERT INTO users (email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.email, input.phone, input.passwordHash, input.role],
    );
    return toDomain(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE phone = $1`,
      [phone],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
  }

  async updatePhone(userId: string, phone: string): Promise<void> {
    await this.db.query(`UPDATE users SET phone = $1 WHERE id = $2`, [
      phone,
      userId,
    ]);
  }

  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.db.query(`UPDATE users SET status = $1 WHERE id = $2`, [
      status,
      userId,
    ]);
  }
}
