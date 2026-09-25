import type { ContributionPayment } from './contribution-payment';
import type { ContributionAllocation } from './contribution-allocation';
import type { ContributionStatus } from './contribution-status';
import type { ContributionMethod } from './contribution-method';

export interface CreatePaymentParams {
  memberId: string;
  amount: number;
  paymentDate: Date;
  method: ContributionMethod;
  reference?: string;
  notes?: string;
  proofUrl: string;
  allocations: {
    monthlyObligationId: string;
    amount: number;
  }[];
}

export interface ListPaymentsFilter {
  status?: ContributionStatus;
  memberId?: string;
  page: number;
  limit: number;
}

export interface ListPaymentsResult {
  items: ContributionPayment[];
  page: number;
  limit: number;
  total: number;
}

export interface ContributionRepositoryInterface {
  createPaymentWithAllocations(
    params: CreatePaymentParams,
  ): Promise<ContributionPayment>;

  findById(id: string): Promise<ContributionPayment | null>;

  list(filter: ListPaymentsFilter): Promise<ListPaymentsResult>;

  findPendingOrApprovedAllocationForObligation(
    obligationId: string,
  ): Promise<ContributionAllocation | null>;

  /**
   * Atomically: set payment status to APPROVED, record reviewer,
   * and mark every allocated obligation as PAID — all in one transaction.
   */
  approveAndMarkObligationsPaid(
    id: string,
    reviewedBy: string,
  ): Promise<ContributionPayment | null>;

  markRejected(
    id: string,
    rejectionReason: string,
    reviewedBy: string,
  ): Promise<ContributionPayment | null>;
}

export const CONTRIBUTION_REPOSITORY = Symbol('CONTRIBUTION_REPOSITORY');
