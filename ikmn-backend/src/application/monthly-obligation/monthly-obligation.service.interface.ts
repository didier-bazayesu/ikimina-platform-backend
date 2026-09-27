import type {
  MonthlyObligation,
  MonthlyObligationStatus,
} from './monthly-obligation';

export interface ListObligationsParams {
  memberId?: string;
  status?: MonthlyObligationStatus;
  month?: number;
  year?: number;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface ListObligationsResponse {
  items: MonthlyObligation[];
  page: number;
  limit: number;
  total: number;
}

export interface MonthlyObligationServiceInterface {
  generateObligationsForPeriod(month: number, year: number): Promise<void>;
  listObligations(
    params: ListObligationsParams,
  ): Promise<ListObligationsResponse>;
  getMyObligations(
    memberId: string,
    params: ListObligationsParams,
  ): Promise<ListObligationsResponse>;
  countOverdueForMembers(memberIds: string[]): Promise<Map<string, number>>;
}

export const MONTHLY_OBLIGATION_SERVICE = Symbol('MONTHLY_OBLIGATION_SERVICE');
