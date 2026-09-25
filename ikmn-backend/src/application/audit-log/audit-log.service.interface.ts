import type { AuditLog } from './audit-log';
import type {
  CreateAuditLogParams,
  ListAuditLogsFilter,
} from './audit-log.repository.interface';

export interface AuditLogServiceInterface {
  recordLog(
    params: CreateAuditLogParams,
    dbConnection?: unknown,
  ): Promise<AuditLog>;
  listLogs(
    filter: ListAuditLogsFilter,
  ): Promise<{ items: AuditLog[]; page: number; limit: number; total: number }>;
}

export const AUDIT_LOG_SERVICE = Symbol('AUDIT_LOG_SERVICE');
