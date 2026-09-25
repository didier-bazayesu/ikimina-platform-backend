import type { Withdrawal } from './withdrawal';
import type { WithdrawalCategory } from './withdrawal-category';

export interface CreateWithdrawalParams {
  amount: number;
  withdrawalDate: Date;
  beneficiary: string;
  category: WithdrawalCategory;
  description: string;
  supportingDocUrl?: string;
  createdBy: string;
}

export interface ListWithdrawalsFilter {
  category?: WithdrawalCategory;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface ListWithdrawalsResult {
  items: Withdrawal[];
  page: number;
  limit: number;
  total: number;
}

export interface WithdrawalRepositoryInterface {
  create(params: CreateWithdrawalParams): Promise<Withdrawal>;
  list(filter: ListWithdrawalsFilter): Promise<ListWithdrawalsResult>;
}

export const WITHDRAWAL_REPOSITORY = Symbol('WITHDRAWAL_REPOSITORY');
