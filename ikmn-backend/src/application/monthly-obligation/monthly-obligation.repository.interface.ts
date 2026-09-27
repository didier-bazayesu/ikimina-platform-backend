import type {
  MonthlyObligation,
  MonthlyObligationStatus,
} from './monthly-obligation';

export interface CreateMonthlyObligationParams {
  memberId: string;
  month: number;
  year: number;
  expectedAmount: number;
  dueDay: number;
  currency: string;
}

export interface ListObligationsFilter {
  memberId?: string;
  status?: MonthlyObligationStatus;
  month?: number;
  year?: number;
  page: number;
  limit: number;
}

export interface ListObligationsResult {
  items: MonthlyObligation[];
  page: number;
  limit: number;
  total: number;
}

export interface MonthlyObligationRepositoryInterface {
  create(
    params: CreateMonthlyObligationParams,
  ): Promise<MonthlyObligation | null>;
  list(filter: ListObligationsFilter): Promise<ListObligationsResult>;
  findByMemberAndPeriod(
    memberId: string,
    month: number,
    year: number,
  ): Promise<MonthlyObligation | null>;
  markPaid(id: string): Promise<MonthlyObligation | null>;

  listUnpaidForMembers(memberIds: string[]): Promise<MonthlyObligation[]>;
  countPaidForMembers(memberIds: string[]): Promise<Map<string, number>>;
}

export const MONTHLY_OBLIGATION_REPOSITORY = Symbol(
  'MONTHLY_OBLIGATION_REPOSITORY',
);
