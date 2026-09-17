import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { DatabaseModule } from './database.module';
import { ReportController } from '../controller/report/report.controller';
import { REPORT_SERVICE } from '../application/report/report.service.interface';
import { ReportService } from '../application/report/report.service';
import { EXPORT_SERVICE } from '../application/report/export.service.interface';
import { ExportService } from '../application/report/export.service';
import { REPORT_REPOSITORY } from '../application/report/report.repository.interface';
import { ReportRepository } from '../persistence/report.repository';

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [ReportController],
  providers: [
    {
      provide: REPORT_SERVICE,
      useClass: ReportService,
    },
    {
      provide: EXPORT_SERVICE,
      useClass: ExportService,
    },
    {
      provide: REPORT_REPOSITORY,
      useClass: ReportRepository,
    },
  ],
  exports: [REPORT_SERVICE, EXPORT_SERVICE, REPORT_REPOSITORY],
})
export class ReportModule {}
