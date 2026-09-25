import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { STORAGE_ADAPTER } from '../application/common/storage.interface';
import { StorageAdapter } from '../persistence/storage';
import { TIME_PROVIDER } from '../application/common/time-provider.interface';
import { TimeProvider } from '../application/common/time-provider';
import { WITHDRAWAL_REPOSITORY } from '../application/withdrawal/withdrawal.repository.interface';
import { WithdrawalRepository } from '../persistence/withdrawal.repository';
import { WITHDRAWAL_SERVICE } from '../application/withdrawal/withdrawal.service.interface';
import { WithdrawalService } from '../application/withdrawal/withdrawal.service';
import { WithdrawalController } from '../controller/withdrawal/withdrawal.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [WithdrawalController],
  providers: [
    { provide: STORAGE_ADAPTER, useClass: StorageAdapter },
    { provide: TIME_PROVIDER, useClass: TimeProvider },
    { provide: WITHDRAWAL_REPOSITORY, useClass: WithdrawalRepository },
    { provide: WITHDRAWAL_SERVICE, useClass: WithdrawalService },
  ],
  exports: [WITHDRAWAL_SERVICE, WITHDRAWAL_REPOSITORY],
})
export class WithdrawalModule {}
