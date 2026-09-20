/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { AUDIT_LOG_SERVICE } from '../../application/audit-log/audit-log.service.interface';
import type { AuditLogServiceInterface } from '../../application/audit-log/audit-log.service.interface';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogController {
  constructor(
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: AuditLogServiceInterface,
  ) {}

  @Get('/')
  async listLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('adminUserId') adminUserId?: string,
    @Query('actionType') actionType?: string,
    @Query('entityName') entityName?: string,
  ) {
    const filter = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      adminUserId,
      actionType,
      entityName,
    };
    return this.auditLogService.listLogs(filter);
  }
}
