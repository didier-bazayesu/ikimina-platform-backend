import type { Transaction } from './transaction';
import type { TransactionType } from './transaction-type';

export interface ListTransactionsParams {
  memberId?: string; // Explicitly filter by member
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  currentUserRole: 'ADMIN' | 'MEMBER';
  currentUserId: string;
}

export interface ListTransactionsResponse {
  items: Transaction[];
  page: number;
  limit: number;
  total: number;
}

export interface TransactionServiceInterface {
  listTransactions(
    params: ListTransactionsParams,
  ): Promise<ListTransactionsResponse>;
  getAvailableBalance(): Promise<number>;
}

export const TRANSACTION_SERVICE = Symbol('TRANSACTION_SERVICE');
