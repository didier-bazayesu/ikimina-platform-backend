export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

export interface ContributionReportRow {
  date: Date;
  amount: number;
  memberName: string;
  method: string;
  status: string;
}

export interface PenaltyReportRow {
  date: Date;
  amount: number;
  memberName: string;
  status: string;
}

export interface DefaulterReportRow {
  memberName: string;
  memberNumber: string;
  missingMonths: number;
  amountOwed: number;
}

export interface WithdrawalReportRow {
  category: string;
  totalAmount: number;
}

export interface FinancialSummary {
  totalInflows: number;
  totalOutflows: number;
  net: number;
}

export interface ReportRepositoryInterface {
  getContributionsReport(
    filters?: ReportFilters,
  ): Promise<ContributionReportRow[]>;
  getPenaltiesReport(filters?: ReportFilters): Promise<PenaltyReportRow[]>;
  getDefaultersReport(): Promise<DefaulterReportRow[]>;
  getWithdrawalsReport(filters?: ReportFilters): Promise<WithdrawalReportRow[]>;
  getFinancialSummary(filters?: ReportFilters): Promise<FinancialSummary>;
}

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');
