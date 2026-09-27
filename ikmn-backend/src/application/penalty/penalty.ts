import type { PenaltyStatus } from './penalty-status';

export interface Penalty {
  id: string;
  memberId: string;
  monthlyObligationId: string;
  amount: number;
  status: PenaltyStatus;
  createdAt: Date;
  updatedAt: Date;
  month?: number;
  year?: number;
  memberNumber?: string;
  memberName?: string;
}
