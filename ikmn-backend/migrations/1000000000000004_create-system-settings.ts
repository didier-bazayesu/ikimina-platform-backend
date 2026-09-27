import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('system_settings', {
    id: {
      type: 'smallint',
      primaryKey: true,
      default: 1,
      check: 'id = 1', // Enforces singleton
    },
    monthly_share_amount: {
      type: 'numeric(15, 2)',
      notNull: true,
    },
    penalty_percentage: {
      type: 'numeric(5, 2)',
      notNull: true,
    },
    due_day: {
      type: 'smallint',
      notNull: true,
      check: 'due_day >= 1 AND due_day <= 28',
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_by: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
    },
  });

  // Seed the initial singleton row
  pgm.sql(`
    INSERT INTO system_settings (
      id, monthly_share_amount, penalty_percentage, due_day, currency
    ) VALUES (
      1, 20000, 10, 7, 'RWF'
    )
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('system_settings');
}
