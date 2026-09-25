import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  await pgm.sql(`
    CREATE SEQUENCE IF NOT EXISTS member_number_seq START 1;

    CREATE TABLE members (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
      member_number VARCHAR(10)  NOT NULL UNIQUE,
      full_name     VARCHAR(255) NOT NULL,
      national_id   VARCHAR(100),
      address       TEXT,
      joined_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_members_user_id       ON members(user_id);
    CREATE INDEX idx_members_member_number ON members(member_number);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  await pgm.sql(`
    DROP TABLE  IF EXISTS members;
    DROP SEQUENCE IF EXISTS member_number_seq;
  `);
}
