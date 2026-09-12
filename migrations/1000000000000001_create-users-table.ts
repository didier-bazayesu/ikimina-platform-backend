import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  await pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TYPE user_role AS ENUM ('MEMBER', 'ADMIN');
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'EXITED');

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL,
      status user_status NOT NULL DEFAULT 'ACTIVE',
      joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_users_email ON users(email);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  await pgm.sql(`
    DROP TABLE IF EXISTS users;
    DROP TYPE IF EXISTS user_status;
    DROP TYPE IF EXISTS user_role;
  `);
}
