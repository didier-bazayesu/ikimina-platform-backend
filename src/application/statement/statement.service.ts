import { Injectable, Inject } from '@nestjs/common';
import { STATEMENT_REPOSITORY } from './statement.repository.interface';
import type {
  StatementRepositoryInterface,
  StatementData,
} from './statement.repository.interface';
import type { StatementServiceInterface } from './statement.service.interface';
import { StatementQueryDto } from '../../controller/statement/statement-query.dto';

@Injectable()
export class StatementService implements StatementServiceInterface {
  constructor(
    @Inject(STATEMENT_REPOSITORY)
    private readonly statementRepository: StatementRepositoryInterface,
  ) {}

  async getMemberStatement(
    memberId: string,
    filters: StatementQueryDto,
  ): Promise<StatementData> {
    const data = await this.statementRepository.getStatement(memberId, {
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    let currentBalance = data.openingBalance;
    for (const tx of data.transactions) {
      currentBalance += tx.amount;
      tx.runningBalance = currentBalance;
    }

    return data;
  }
}
