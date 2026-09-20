import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { AUDIT_LOG_REPOSITORY } from '../application/audit-log/audit-log.repository.interface';
import { AUDIT_LOG_SERVICE } from '../application/audit-log/audit-log.service.interface';
import { AuditLogRepository } from '../persistence/audit-log.repository';
import { AuditLogService } from '../application/audit-log/audit-log.service';
import { DatabaseModule } from './database.module';
import { AuditLogController } from '../controller/audit-log/audit-log.controller';

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [AuditLogController],
  providers: [
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepository,
    },
    {
      provide: AUDIT_LOG_SERVICE,
      useClass: AuditLogService,
    },
  ],
  exports: [AUDIT_LOG_SERVICE, AUDIT_LOG_REPOSITORY],
})
export class AuditLogModule {}
