import type { Withdrawal } from './withdrawal';
import type { WithdrawalCategory } from './withdrawal-category';

export interface RecordWithdrawalParams {
  amount: number;
  withdrawalDate: Date;
  beneficiary: string;
  category: WithdrawalCategory;
  description: string;
  file?: { originalname: string; buffer: Buffer; mimetype: string };
  adminUserId: string;
}

export interface ListWithdrawalsParams {
  category?: WithdrawalCategory;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ListWithdrawalsResponse {
  items: Withdrawal[];
  page: number;
  limit: number;
  total: number;
}

export interface WithdrawalServiceInterface {
  recordWithdrawal(params: RecordWithdrawalParams): Promise<Withdrawal>;
  listWithdrawals(
    params: ListWithdrawalsParams,
  ): Promise<ListWithdrawalsResponse>;
}

export const WITHDRAWAL_SERVICE = Symbol('WITHDRAWAL_SERVICE');
