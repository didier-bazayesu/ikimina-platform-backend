import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { MemberModule } from './member.module';
import { SystemSettingsModule } from './system-settings.module';

import { TIME_PROVIDER } from '../application/common/time-provider.interface';
import { TimeProvider } from '../application/common/time-provider';

import { MONTHLY_OBLIGATION_REPOSITORY } from '../application/monthly-obligation/monthly-obligation.repository.interface';
import { MonthlyObligationRepository } from '../persistence/monthly-obligation.repository';

import { MONTHLY_OBLIGATION_SERVICE } from '../application/monthly-obligation/monthly-obligation.service.interface';
import { MonthlyObligationService } from '../application/monthly-obligation/monthly-obligation.service';

import { MonthlyObligationScheduler } from '../application/monthly-obligation/monthly-obligation.scheduler';
import { MonthlyObligationController } from '../controller/monthly-obligation/monthly-obligation.controller';

@Module({
  imports: [AuthenticationModule, MemberModule, SystemSettingsModule],
  controllers: [MonthlyObligationController],
  providers: [
    { provide: TIME_PROVIDER, useClass: TimeProvider },
    {
      provide: MONTHLY_OBLIGATION_REPOSITORY,
      useClass: MonthlyObligationRepository,
    },
    { provide: MONTHLY_OBLIGATION_SERVICE, useClass: MonthlyObligationService },
    MonthlyObligationScheduler,
  ],
  exports: [MONTHLY_OBLIGATION_SERVICE, MONTHLY_OBLIGATION_REPOSITORY], // Export repo in case Sprint 5 payment service needs to mark it paid directly
})
export class MonthlyObligationModule {}
