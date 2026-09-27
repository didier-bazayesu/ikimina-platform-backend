import { Module } from '@nestjs/common';
import { DashboardController } from '../controller/dashboard/dashboard.controller';
import { DashboardService } from '../application/dashboard/dashboard.service';
import { DASHBOARD_SERVICE } from '../application/dashboard/dashboard.service.interface';
import { DASHBOARD_REPOSITORY } from '../application/dashboard/dashboard.interface';
import { DashboardRepository } from '../persistence/dashboard.repository';
import { MemberModule } from './member.module';
import { AuthenticationModule } from './authentication.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [AuthenticationModule, MemberModule, DatabaseModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: DASHBOARD_SERVICE,
      useClass: DashboardService,
    },
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: DashboardRepository,
    },
  ],
  exports: [DASHBOARD_SERVICE, DASHBOARD_REPOSITORY],
})
export class DashboardModule {}
