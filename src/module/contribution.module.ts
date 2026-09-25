import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { MemberModule } from './member.module';
import { MonthlyObligationModule } from './monthly-obligation.module';
import { STORAGE_ADAPTER } from '../application/common/storage.interface';
import { StorageAdapter } from '../persistence/storage';
import { CONTRIBUTION_REPOSITORY } from '../application/payment/contribution.repository.interface';
import { ContributionRepository } from '../persistence/contribution.repository';
import { CONTRIBUTION_SERVICE } from '../application/payment/contribution.service.interface';
import { ContributionService } from '../application/payment/contribution.service';
import { ContributionController } from '../controller/payment/contribution.controller';

@Module({
  imports: [AuthenticationModule, MemberModule, MonthlyObligationModule],
  controllers: [ContributionController],
  providers: [
    { provide: STORAGE_ADAPTER, useClass: StorageAdapter },
    { provide: CONTRIBUTION_REPOSITORY, useClass: ContributionRepository },
    { provide: CONTRIBUTION_SERVICE, useClass: ContributionService },
  ],
  exports: [CONTRIBUTION_SERVICE, CONTRIBUTION_REPOSITORY],
})
export class ContributionModule {}
