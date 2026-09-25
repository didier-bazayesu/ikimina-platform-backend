import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('contribution_status', ['PENDING', 'APPROVED', 'REJECTED']);
  pgm.createType('contribution_method', ['MOMO', 'BANK', 'CASH']);

  pgm.createTable('contribution_payments', {
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
    amount: {
      type: 'numeric(15, 2)',
      notNull: true,
    },
    payment_date: {
      type: 'date',
      notNull: true,
    },
    method: {
      type: 'contribution_method',
      notNull: true,
    },
    reference: {
      type: 'varchar(255)',
      notNull: false,
    },
    notes: {
      type: 'text',
      notNull: false,
    },
    proof_url: {
      type: 'varchar(500)',
      notNull: true,
    },
    status: {
      type: 'contribution_status',
      notNull: true,
      default: 'PENDING',
    },
    rejection_reason: {
      type: 'text',
      notNull: false,
    },
    reviewed_by: {
      type: 'uuid',
      notNull: false,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    reviewed_at: {
      type: 'timestamptz',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createTable('contribution_allocations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    contribution_payment_id: {
      type: 'uuid',
      notNull: true,
      references: '"contribution_payments"',
      onDelete: 'RESTRICT',
    },
    monthly_obligation_id: {
      type: 'uuid',
      notNull: true,
      references: '"monthly_obligations"',
      onDelete: 'RESTRICT',
    },
    amount: {
      type: 'numeric(15, 2)',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('contribution_allocations');
  pgm.dropTable('contribution_payments');
  pgm.dropType('contribution_method');
  pgm.dropType('contribution_status');
}
