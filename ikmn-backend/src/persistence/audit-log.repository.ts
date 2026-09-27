import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  AuditLogRepositoryInterface,
  CreateAuditLogParams,
  ListAuditLogsFilter,
} from '../application/audit-log/audit-log.repository.interface';
import type { AuditLog } from '../application/audit-log/audit-log';

@Injectable()
export class AuditLogRepository implements AuditLogRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(
    params: CreateAuditLogParams,
    dbConnection?: unknown,
  ): Promise<AuditLog> {
    const connection =
      (dbConnection as {
        query?: (q: string, p: unknown[]) => Promise<Record<string, unknown>[]>;
      }) || this.db;

    const queryStr = `
      INSERT INTO audit_logs
      (admin_user_id, action_type, entity_name, entity_id, old_state, new_state)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const queryParams = [
      params.adminUserId,
      params.actionType,
      params.entityName,
      params.entityId,
      params.oldState ? JSON.stringify(params.oldState) : null,
      params.newState ? JSON.stringify(params.newState) : null,
    ];

    let rows;
    if (typeof connection.query === 'function') {
      rows = await connection.query(queryStr, queryParams);
    } else {
      // In case the dbConnection passed doesn't have query directly, fallback to this.db
      rows = await this.db.query(queryStr, queryParams);
    }

    return this.mapToDomain(rows[0]);
  }

  async list(filter: ListAuditLogsFilter): Promise<{
    items: AuditLog[];
    page: number;
    limit: number;
    total: number;
  }> {
    const { page, limit, adminUserId, actionType, entityName } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (adminUserId) {
      params.push(adminUserId);
      conditions.push(`admin_user_id = $${params.length}`);
    }
    if (actionType) {
      params.push(actionType);
      conditions.push(`action_type = $${params.length}`);
    }
    if (entityName) {
      params.push(entityName);
      conditions.push(`entity_name = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM audit_logs ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map((r) => this.mapToDomain(r)),
      page,
      limit,
      total,
    };
  }

  private mapToDomain(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      adminUserId: row.admin_user_id as string,
      actionType: row.action_type as string,
      entityName: row.entity_name as string,
      entityId: row.entity_id as string,
      oldState:
        typeof row.old_state === 'string'
          ? JSON.parse(row.old_state)
          : (row.old_state as Record<string, unknown> | null),
      newState:
        typeof row.new_state === 'string'
          ? JSON.parse(row.new_state)
          : (row.new_state as Record<string, unknown> | null),
      createdAt: new Date(row.created_at as string | number | Date),
    };
  }
}
