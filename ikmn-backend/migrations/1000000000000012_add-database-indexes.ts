import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('members', ['user_id'], {
    name: 'idx_members_user_id',
    ifNotExists: true,
  });
  pgm.createIndex('monthly_obligations', ['member_id', 'status'], {
    name: 'idx_monthly_obligations_member_status',
    ifNotExists: true,
  });
  pgm.createIndex(
    'contribution_payments',
    ['member_id', 'status', 'payment_date'],
    { name: 'idx_contribution_payments_member_status_date', ifNotExists: true },
  );
  pgm.createIndex('penalties', ['member_id', 'status'], {
    name: 'idx_penalties_member_status',
    ifNotExists: true,
  });
  pgm.createIndex('audit_logs', ['admin_user_id', 'action_type'], {
    name: 'idx_audit_logs_admin_action',
    ifNotExists: true,
  });
  pgm.createIndex('notifications', ['user_id', 'is_read'], {
    name: 'idx_notifications_user_read',
    ifNotExists: true,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('notifications', ['user_id', 'is_read'], {
    name: 'idx_notifications_user_read',
    ifExists: true,
  });
  pgm.dropIndex('audit_logs', ['admin_user_id', 'action_type'], {
    name: 'idx_audit_logs_admin_action',
    ifExists: true,
  });
  pgm.dropIndex('penalties', ['member_id', 'status'], {
    name: 'idx_penalties_member_status',
    ifExists: true,
  });
  pgm.dropIndex(
    'contribution_payments',
    ['member_id', 'status', 'payment_date'],
    { name: 'idx_contribution_payments_member_status_date', ifExists: true },
  );
  pgm.dropIndex('monthly_obligations', ['member_id', 'status'], {
    name: 'idx_monthly_obligations_member_status',
    ifExists: true,
  });
  pgm.dropIndex('members', ['user_id'], {
    name: 'idx_members_user_id',
    ifExists: true,
  });
}
