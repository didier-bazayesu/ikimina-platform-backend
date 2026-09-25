export interface AuditLog {
  id: string;
  adminUserId: string;
  actionType: string;
  entityName: string;
  entityId: string;
  oldState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  createdAt: Date;
}
