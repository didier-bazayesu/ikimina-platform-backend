import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  await pgm.sql(`
    -- Drop the auto-generated unique constraints if they exist
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
    
    -- Or drop them if they were created as unique indexes instead of constraints
    DROP INDEX IF EXISTS users_email_key;
    DROP INDEX IF EXISTS users_phone_key;

    -- Create conditional unique indexes that only apply to non-exited users
    CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE status != 'EXITED';
    CREATE UNIQUE INDEX idx_users_phone_active ON users(phone) WHERE status != 'EXITED';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  await pgm.sql(`
    -- Revert back to unconditional unique constraints
    DROP INDEX IF EXISTS idx_users_email_active;
    DROP INDEX IF EXISTS idx_users_phone_active;
    
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE(email);
    ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE(phone);
  `);
}
