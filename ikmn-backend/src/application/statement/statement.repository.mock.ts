import {
  StatementData,
  StatementFilters,
  StatementRepositoryInterface,
} from './statement.repository.interface';

export class StatementRepositoryMock implements StatementRepositoryInterface {
  async getStatement(
    memberId: string,
    filters?: StatementFilters,
  ): Promise<StatementData> {
    return {
      member: {
        name: 'Mock Member',
        number: 'MOCK-001',
      },
      period: {
        start: filters?.startDate,
        end: filters?.endDate,
      },
      openingBalance: 1000,
      closingBalance: 2000,
      transactions: [
        {
          date: new Date(),
          description: 'Mock transaction',
          amount: 1000,
        },
      ],
    };
  }
}
