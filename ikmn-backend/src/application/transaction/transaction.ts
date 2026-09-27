import type { TransactionType } from './transaction-type';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  memberId: string | null;
  date: Date;
  reference: string | null;
  createdAt: Date;
}
