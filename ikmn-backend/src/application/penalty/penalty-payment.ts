import type { ContributionMethod } from '../payment/contribution-method';

export type PenaltyPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PenaltyPayment {
  id: string;
  penaltyId: string;
  amount: number;
  paymentDate: Date;
  method: ContributionMethod;
  reference?: string;
  notes?: string;
  proofUrl: string;
  status: PenaltyPaymentStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  memberNumber?: string;
  memberName?: string;
}
