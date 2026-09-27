import type { AuditLog } from './audit-log';

export interface CreateAuditLogParams {
  adminUserId: string;
  actionType: string;
  entityName: string;
  entityId: string;
  oldState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
}

export interface ListAuditLogsFilter {
  adminUserId?: string;
  actionType?: string;
  entityName?: string;
  page: number;
  limit: number;
}

export interface AuditLogRepositoryInterface {
  create(
    params: CreateAuditLogParams,
    dbConnection?: unknown,
  ): Promise<AuditLog>;
  list(
    filter: ListAuditLogsFilter,
  ): Promise<{ items: AuditLog[]; page: number; limit: number; total: number }>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
