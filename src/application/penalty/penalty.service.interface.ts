import type { Penalty } from './penalty';
import type { PenaltyPayment } from './penalty-payment';
import type { PenaltyStatus } from './penalty-status';
import type { PenaltyPaymentStatus } from './penalty-payment';
import type { ContributionMethod } from '../payment/contribution-method';

export interface SubmitPenaltyPaymentParams {
  memberId: string;
  penaltyId: string;
  amount: number;
  paymentDate: Date;
  method: ContributionMethod;
  reference?: string;
  notes?: string;
  file: { originalname: string; buffer: Buffer; mimetype: string };
}

export interface ListPenaltiesParams {
  memberId?: string;
  status?: PenaltyStatus;
  page?: number;
  limit?: number;
}

export interface ListPenaltiesResponse {
  items: Penalty[];
  page: number;
  limit: number;
  total: number;
}

export interface ListPenaltyPaymentsParams {
  memberId?: string;
  status?: PenaltyPaymentStatus;
  page?: number;
  limit?: number;
}

export interface ListPenaltyPaymentsResponse {
  items: PenaltyPayment[];
  page: number;
  limit: number;
  total: number;
}

export interface PenaltyServiceInterface {
  generatePenaltiesForOverdueObligations(): Promise<void>;
  submitPenaltyPayment(
    params: SubmitPenaltyPaymentParams,
  ): Promise<PenaltyPayment>;
  listPenalties(params: ListPenaltiesParams): Promise<ListPenaltiesResponse>;
  getMyPenalties(
    memberId: string,
    params: ListPenaltiesParams,
  ): Promise<ListPenaltiesResponse>;
  listPenaltyPayments(
    params: ListPenaltyPaymentsParams,
  ): Promise<ListPenaltyPaymentsResponse>;
  getMyPenaltyPayments(
    memberId: string,
    params: ListPenaltyPaymentsParams,
  ): Promise<ListPenaltyPaymentsResponse>;
  approvePenaltyPayment(
    id: string,
    adminUserId: string,
  ): Promise<PenaltyPayment>;
  rejectPenaltyPayment(
    id: string,
    reason: string,
    adminUserId: string,
  ): Promise<PenaltyPayment>;
  waivePenalty(id: string): Promise<Penalty>;
}

export const PENALTY_SERVICE = Symbol('PENALTY_SERVICE');
