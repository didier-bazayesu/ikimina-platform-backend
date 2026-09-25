import type { ContributionStatus } from './contribution-status';
import type { ContributionMethod } from './contribution-method';
import type { ContributionAllocation } from './contribution-allocation';

export interface ContributionPayment {
  id: string;
  memberId: string;
  amount: number;
  paymentDate: Date;
  method: ContributionMethod;
  reference?: string;
  notes?: string;
  proofUrl: string;
  status: ContributionStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  allocations: ContributionAllocation[];
  memberNumber?: string;
  memberName?: string;
}
