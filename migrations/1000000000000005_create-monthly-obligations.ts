import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // We use Postgres ENUM for status, or just a VARCHAR constraint
  pgm.createType('monthly_obligation_status', ['UNPAID', 'PAID']);

  pgm.createTable('monthly_obligations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    member_id: {
      type: 'uuid',
      notNull: true,
      references: '"members"',
      onDelete: 'RESTRICT',
    },
    month: {
      type: 'smallint',
      notNull: true,
      check: 'month >= 1 AND month <= 12',
    },
    year: {
      type: 'smallint',
      notNull: true,
    },
    expected_amount: {
      type: 'numeric(15, 2)',
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
    status: {
      type: 'monthly_obligation_status',
      notNull: true,
      default: 'UNPAID',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Enforce idempotency: one obligation per member per period
  pgm.addConstraint(
    'monthly_obligations',
    'unique_member_period',
    'UNIQUE(member_id, month, year)',
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('monthly_obligations');
  pgm.dropType('monthly_obligation_status');
}
