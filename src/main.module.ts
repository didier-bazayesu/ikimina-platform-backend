import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './module/health.module';
import { DatabaseModule } from './module/database.module';
import { AppConfigModule } from './module/app-config.module';
import { AuthenticationModule } from './module/authentication.module';
import { MemberModule } from './module/member.module';
import { SystemSettingsModule } from './module/system-settings.module';
import { MonthlyObligationModule } from './module/monthly-obligation.module';
import { ContributionModule } from './module/contribution.module';
import { PenaltyModule } from './module/penalty.module';
import { WithdrawalModule } from './module/withdrawal.module';
import { TransactionModule } from './module/transaction.module';
import { DashboardModule } from './module/dashboard.module';
import { ReportModule } from './module/report.module';
import { StatementModule } from './module/statement.module';
import { NotificationModule } from './module/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    HealthModule,
    DatabaseModule,
    AppConfigModule,
    AuthenticationModule,
    MemberModule,
    SystemSettingsModule,
    MonthlyObligationModule,
    ContributionModule,
    PenaltyModule,
    WithdrawalModule,
    TransactionModule,
    DashboardModule,
    ReportModule,
    StatementModule,
    NotificationModule,
  ],
})
export class MainModule {}
