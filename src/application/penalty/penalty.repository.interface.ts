import type { Penalty } from './penalty';
import type { PenaltyPayment, PenaltyPaymentStatus } from './penalty-payment';
import type { PenaltyStatus } from './penalty-status';
import type { ContributionMethod } from '../payment/contribution-method';

export interface CreatePenaltyParams {
  memberId: string;
  monthlyObligationId: string;
  amount: number;
}

export interface CreatePenaltyPaymentParams {
  penaltyId: string;
  amount: number;
  paymentDate: Date;
  method: ContributionMethod;
  reference?: string;
  notes?: string;
  proofUrl: string;
}

export interface ListPenaltiesFilter {
  memberId?: string;
  status?: PenaltyStatus;
  page: number;
  limit: number;
}

export interface ListPenaltiesResult {
  items: Penalty[];
  page: number;
  limit: number;
  total: number;
}

export interface ListPenaltyPaymentsFilter {
  memberId?: string;
  status?: PenaltyPaymentStatus;
  page: number;
  limit: number;
}

export interface ListPenaltyPaymentsResult {
  items: PenaltyPayment[];
  page: number;
  limit: number;
  total: number;
}

export interface PenaltyRepositoryInterface {
  createPenalty(params: CreatePenaltyParams): Promise<Penalty>;
  findPenaltyById(id: string): Promise<Penalty | null>;
  findPenaltyByObligationId(obligationId: string): Promise<Penalty | null>;
  listPenalties(filter: ListPenaltiesFilter): Promise<ListPenaltiesResult>;
  updatePenaltyStatus(
    id: string,
    status: PenaltyStatus,
  ): Promise<Penalty | null>;
  createPenaltyPayment(
    params: CreatePenaltyPaymentParams,
  ): Promise<PenaltyPayment>;
  findPenaltyPaymentById(id: string): Promise<PenaltyPayment | null>;
  listPenaltyPayments(
    filter: ListPenaltyPaymentsFilter,
  ): Promise<ListPenaltyPaymentsResult>;
  /**
   * Atomically: approve the penalty payment and mark the penalty as PAID.
   */
  approvePenaltyPaymentAndMarkPaid(
    id: string,
    reviewedBy: string,
  ): Promise<PenaltyPayment | null>;
  rejectPenaltyPayment(
    id: string,
    rejectionReason: string,
    reviewedBy: string,
  ): Promise<PenaltyPayment | null>;
}

export const PENALTY_REPOSITORY = Symbol('PENALTY_REPOSITORY');
