import { Module, forwardRef } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { MemberModule } from './member.module';
import { MonthlyObligationModule } from './monthly-obligation.module';
import { SystemSettingsModule } from './system-settings.module';
import { STORAGE_ADAPTER } from '../application/common/storage.interface';
import { StorageAdapter } from '../persistence/storage';
import { TIME_PROVIDER } from '../application/common/time-provider.interface';
import { TimeProvider } from '../application/common/time-provider';
import { PENALTY_REPOSITORY } from '../application/penalty/penalty.repository.interface';
import { PenaltyRepository } from '../persistence/penalty.repository';
import { PENALTY_SERVICE } from '../application/penalty/penalty.service.interface';
import { PenaltyService } from '../application/penalty/penalty.service';
import { PenaltyScheduler } from '../application/penalty/penalty.scheduler';
import { PenaltyController } from '../controller/penalty/penalty.controller';

@Module({
  imports: [
    AuthenticationModule,
    forwardRef(() => MemberModule),
    MonthlyObligationModule,
    SystemSettingsModule,
  ],
  controllers: [PenaltyController],
  providers: [
    { provide: STORAGE_ADAPTER, useClass: StorageAdapter },
    { provide: TIME_PROVIDER, useClass: TimeProvider },
    { provide: PENALTY_REPOSITORY, useClass: PenaltyRepository },
    { provide: PENALTY_SERVICE, useClass: PenaltyService },
    PenaltyScheduler,
  ],
  exports: [PENALTY_SERVICE, PENALTY_REPOSITORY],
})
export class PenaltyModule {}
