// src/controller/authentication/authentication.controller.integration-test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { AuthenticationModule } from '../../module/authentication.module';
import { DatabaseModule } from '../../module/database.module';
import { DATABASE_CONNECTION } from '../../module/database.module';
import { AppConfigModule } from '../../module/app-config.module';
import { configureGlobalEnhancers } from '../../setup-app';

const testUserEmail = `integration-login-${process.pid}@example.com`;
const testUserPassword = 'CorrectPassword123!';
const testUserPhone = `+25078${process.pid}`;
const suspendedUserEmail = `integration-suspended-${process.pid}@example.com`;
const exitedUserEmail = `integration-exited-${process.pid}@example.com`;

describe('AuthenticationController (integration)', () => {
  let app: INestApplication;
  let db: {
    query<T = unknown>(queryText: string, values?: unknown[]): Promise<T[]>;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, AuthenticationModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureGlobalEnhancers(app);
    await app.init();

    db = app.get(DATABASE_CONNECTION);
    await db.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    await db.query(
      `INSERT INTO users (email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, 'MEMBER', 'ACTIVE')`,
      [testUserEmail, testUserPhone, await bcrypt.hash(testUserPassword, 4)],
    );
    await db.query(
      `INSERT INTO users (email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, 'MEMBER', $4), ($5, $6, $3, 'MEMBER', $7)`,
      [
        suspendedUserEmail,
        `+25079${process.pid}`,
        await bcrypt.hash(testUserPassword, 4),
        'SUSPENDED',
        exitedUserEmail,
        `+25076${process.pid}`,
        'EXITED',
      ],
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = ANY($1)', [
      [testUserEmail, suspendedUserEmail, exitedUserEmail],
    ]);
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns 400 for a malformed body', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
    });

    it('returns 401 for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever123' });

      expect(response.status).toBe(401);
    });

    it('returns 200 with tokens for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUserEmail);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 400 for a missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('returns a new access token for a valid refresh token', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('returns 401 for an expired refresh token', async () => {
      const expiredToken = await new JwtService({}).signAsync(
        { sub: 'user-1', role: 'MEMBER' },
        {
          secret: process.env['JWT_REFRESH_SECRET'],
          expiresIn: '-1s',
        },
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect(response.status).toBe(401);
    });

    it.each([
      ['suspended', suspendedUserEmail],
      ['exited', exitedUserEmail],
    ])('returns 401 for a %s user', async (_status, email) => {
      const rows = await db.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );
      const refreshToken = await new JwtService({}).signAsync(
        { sub: rows[0]?.id, role: 'MEMBER' },
        {
          secret: process.env['JWT_REFRESH_SECRET'],
          expiresIn: '7d',
        },
      );
      await db.query(
        `INSERT INTO refresh_tokens (member_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '7 days')`,
        [rows[0]?.id, createHash('sha256').update(refreshToken).digest('hex')],
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 400 without a refresh token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout');

      expect(response.status).toBe(400);
    });

    it('revokes the supplied refresh token', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: login.body.data.refreshToken });

      expect(response.status).toBe(200);
      const refreshAttempt = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });
      expect(refreshAttempt.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('returns 401 without an access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          currentPassword: testUserPassword,
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('changes the authenticated user password', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });
      const newPassword = 'NewPassword123!';

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({ currentPassword: testUserPassword, newPassword });

      expect(response.status).toBe(200);

      const newLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: newPassword });
      expect(newLogin.status).toBe(200);

      const oldRefreshAttempt = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });
      expect(oldRefreshAttempt.status).toBe(401);

      await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
        await bcrypt.hash(testUserPassword, 4),
        testUserEmail,
      ]);
    });
  });
});
