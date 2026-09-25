import {
  ContributionReportRow,
  DefaulterReportRow,
  FinancialSummary,
  PenaltyReportRow,
  ReportFilters,
  WithdrawalReportRow,
} from './report.repository.interface';

export interface ReportServiceInterface {
  getContributionsReport(
    filters?: ReportFilters,
  ): Promise<ContributionReportRow[]>;
  getPenaltiesReport(filters?: ReportFilters): Promise<PenaltyReportRow[]>;
  getDefaultersReport(): Promise<DefaulterReportRow[]>;
  getWithdrawalsReport(filters?: ReportFilters): Promise<WithdrawalReportRow[]>;
  getFinancialSummary(filters?: ReportFilters): Promise<FinancialSummary>;
}

export const REPORT_SERVICE = Symbol('REPORT_SERVICE');
