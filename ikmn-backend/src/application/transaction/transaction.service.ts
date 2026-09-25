import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  TransactionServiceInterface,
  ListTransactionsParams,
  ListTransactionsResponse,
} from './transaction.service.interface';
import { TRANSACTION_REPOSITORY } from './transaction.repository.interface';
import type { TransactionRepositoryInterface } from './transaction.repository.interface';

@Injectable()
export class TransactionService implements TransactionServiceInterface {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryInterface,
  ) {}

  async listTransactions(
    params: ListTransactionsParams,
  ): Promise<ListTransactionsResponse> {
    const {
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      currentUserRole,
      currentUserId,
    } = params;

    let memberId = params.memberId;

    // Check currentUserRole. If 'MEMBER', forcefully override memberId to currentUserId.
    if (currentUserRole === 'MEMBER') {
      memberId = currentUserId;
    }

    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }

    return this.transactionRepository.list({
      memberId,
      type,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      page,
      limit,
    });
  }

  async getAvailableBalance(): Promise<number> {
    return this.transactionRepository.calculateAvailableBalance();
  }
}
