import type { ContributionPayment } from './contribution-payment';
import type { ContributionStatus } from './contribution-status';
import type { ContributionMethod } from './contribution-method';

export interface FileInput {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

export interface SubmitContributionPaymentParams {
  memberId: string;
  obligationIds: string[];
  amount: number;
  paymentDate: Date;
  method: ContributionMethod;
  reference?: string;
  notes?: string;
  proofUrl?: string;
  file?: FileInput;
}

export interface RecordOnBehalfParams {
  memberId: string;
  obligationIds: string[];
  amount: number;
  paymentDate: Date;
  withPenalty: boolean;
  notes?: string;
}

export interface ListContributionPaymentsParams {
  status?: ContributionStatus;
  memberId?: string;
  page?: number;
  limit?: number;
}

export interface ListContributionPaymentsResponse {
  items: ContributionPayment[];
  page: number;
  limit: number;
  total: number;
}

export interface ContributionServiceInterface {
  submitPayment(
    params: SubmitContributionPaymentParams,
  ): Promise<ContributionPayment>;

  listPayments(
    params: ListContributionPaymentsParams,
  ): Promise<ListContributionPaymentsResponse>;

  getMyPayments(
    memberId: string,
    params: ListContributionPaymentsParams,
  ): Promise<ListContributionPaymentsResponse>;

  approvePayment(id: string, adminUserId: string): Promise<ContributionPayment>;

  rejectPayment(
    id: string,
    reason: string,
    adminUserId: string,
  ): Promise<ContributionPayment>;

  flagPayment(
    id: string,
    reason: string,
    message: string,
    adminUserId: string,
  ): Promise<ContributionPayment>;

  recordOnBehalf(
    params: RecordOnBehalfParams,
    adminUserId: string,
  ): Promise<{ contributionPayment: ContributionPayment; penaltyPayments: unknown[] }>;
}

export const CONTRIBUTION_SERVICE = Symbol('CONTRIBUTION_SERVICE');
