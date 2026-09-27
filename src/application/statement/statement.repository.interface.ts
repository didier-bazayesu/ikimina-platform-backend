export interface StatementFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface StatementRow {
  date: Date;
  description: string;
  amount: number;
  runningBalance?: number;
}

export interface StatementData {
  member: {
    name: string;
    number: string;
  };
  period: {
    start?: Date;
    end?: Date;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: StatementRow[];
}

export interface StatementRepositoryInterface {
  getStatement(
    memberId: string,
    filters?: StatementFilters,
  ): Promise<StatementData>;
}

export const STATEMENT_REPOSITORY = Symbol('STATEMENT_REPOSITORY');
