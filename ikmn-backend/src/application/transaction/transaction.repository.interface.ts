import type { Transaction } from './transaction';
import type { TransactionType } from './transaction-type';

export interface ListTransactionsFilter {
  memberId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface ListTransactionsResult {
  items: Transaction[];
  page: number;
  limit: number;
  total: number;
}

export interface TransactionRepositoryInterface {
  list(filter: ListTransactionsFilter): Promise<ListTransactionsResult>;
  calculateAvailableBalance(): Promise<number>;
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');
