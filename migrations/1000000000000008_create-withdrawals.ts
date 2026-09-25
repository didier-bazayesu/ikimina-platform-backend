import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('withdrawal_category', ['LOAN', 'PAYOUT', 'EXPENSE', 'OTHER']);

  pgm.createTable('withdrawals', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    amount: {
      type: 'numeric(15, 2)',
      notNull: true,
    },
    withdrawal_date: {
      type: 'date',
      notNull: true,
    },
    beneficiary: {
      type: 'varchar(255)',
      notNull: true,
    },
    category: {
      type: 'withdrawal_category',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    supporting_doc_url: {
      type: 'varchar(500)',
      notNull: false,
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('withdrawals');
  pgm.dropType('withdrawal_category');
}
