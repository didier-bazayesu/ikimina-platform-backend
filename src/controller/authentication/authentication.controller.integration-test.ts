// src/controller/authentication/authentication.controller.integration-test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthenticationModule } from '../../module/authentication.module';
import { DatabaseModule } from '../../module/database.module';
import { AppConfigModule } from '../../module/app-config.module';
import { configureGlobalEnhancers } from '../../setup-app';

describe('AuthenticationController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, AuthenticationModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureGlobalEnhancers(app);
    await app.init();
  });

  afterAll(async () => {
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
      // NOTE: this assumes a real seeded user exists in the Neon test branch —
      // see note below on seeding strategy before this will pass.
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'seed-test-user@example.com',
          password: 'CorrectPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('seed-test-user@example.com');
    });
  });

  describe('GET /health (protected-route stand-in)', () => {
    it('returns 401 with no Authorization header', async () => {
      // Replace '/health' with an actual @UseGuards(JwtAuthGuard) route
      // once one exists — health is public today, this is a placeholder
      // shape until Sprint 2 gives us a real protected endpoint.
    });
  });
});
