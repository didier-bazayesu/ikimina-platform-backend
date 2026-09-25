import type { WithdrawalCategory } from './withdrawal-category';

export interface Withdrawal {
  id: string;
  amount: number;
  withdrawalDate: Date;
  beneficiary: string;
  category: WithdrawalCategory;
  description: string;
  supportingDocUrl?: string;
  createdBy: string;
  createdAt: Date;
  creatorName?: string;
}
