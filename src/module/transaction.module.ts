import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { TRANSACTION_REPOSITORY } from '../application/transaction/transaction.repository.interface';
import { TransactionRepository } from '../persistence/transaction.repository';
import { TRANSACTION_SERVICE } from '../application/transaction/transaction.service.interface';
import { TransactionService } from '../application/transaction/transaction.service';
import { TransactionController } from '../controller/transaction/transaction.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [TransactionController],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionRepository },
    { provide: TRANSACTION_SERVICE, useClass: TransactionService },
  ],
  exports: [TRANSACTION_SERVICE, TRANSACTION_REPOSITORY],
})
export class TransactionModule {}
