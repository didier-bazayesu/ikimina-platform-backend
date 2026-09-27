import type {
  AuditLogRepositoryInterface,
  CreateAuditLogParams,
  ListAuditLogsFilter,
} from './audit-log.repository.interface';
import type { AuditLog } from './audit-log';

export class AuditLogRepositoryMock implements AuditLogRepositoryInterface {
  private logs: AuditLog[] = [];

  async create(params: CreateAuditLogParams): Promise<AuditLog> {
    const log: AuditLog = {
      id: Math.random().toString(),
      ...params,
      createdAt: new Date(),
    };
    this.logs.push(log);
    return log;
  }

  async list(filter: ListAuditLogsFilter): Promise<{
    items: AuditLog[];
    page: number;
    limit: number;
    total: number;
  }> {
    let filtered = this.logs;
    if (filter.adminUserId)
      filtered = filtered.filter((l) => l.adminUserId === filter.adminUserId);
    if (filter.actionType)
      filtered = filtered.filter((l) => l.actionType === filter.actionType);
    if (filter.entityName)
      filtered = filtered.filter((l) => l.entityName === filter.entityName);

    const start = (filter.page - 1) * filter.limit;
    const items = filtered.slice(start, start + filter.limit);
    return {
      items,
      page: filter.page,
      limit: filter.limit,
      total: filtered.length,
    };
  }
}
