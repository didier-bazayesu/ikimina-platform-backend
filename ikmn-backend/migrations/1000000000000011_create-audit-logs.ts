import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    admin_user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    action_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    entity_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    entity_id: {
      type: 'uuid',
      notNull: true,
    },
    old_state: {
      type: 'jsonb',
      notNull: false,
    },
    new_state: {
      type: 'jsonb',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('audit_logs');
}
