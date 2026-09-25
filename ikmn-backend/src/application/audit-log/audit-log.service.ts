import { Injectable, Inject } from '@nestjs/common';
import type { AuditLogServiceInterface } from './audit-log.service.interface';
import { AUDIT_LOG_REPOSITORY } from './audit-log.repository.interface';
import type {
  AuditLogRepositoryInterface,
  CreateAuditLogParams,
  ListAuditLogsFilter,
} from './audit-log.repository.interface';
import type { AuditLog } from './audit-log';

@Injectable()
export class AuditLogService implements AuditLogServiceInterface {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepo: AuditLogRepositoryInterface,
  ) {}

  async recordLog(
    params: CreateAuditLogParams,
    dbConnection?: unknown,
  ): Promise<AuditLog> {
    return this.auditLogRepo.create(params, dbConnection);
  }

  async listLogs(filter: ListAuditLogsFilter): Promise<{
    items: AuditLog[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.auditLogRepo.list(filter);
  }
}
