import {
  ReportRepositoryInterface,
  ContributionReportRow,
  PenaltyReportRow,
  DefaulterReportRow,
  WithdrawalReportRow,
  FinancialSummary,
} from './report.repository.interface';

export class ReportRepositoryMock implements ReportRepositoryInterface {
  async getContributionsReport(): Promise<ContributionReportRow[]> {
    return [];
  }

  async getPenaltiesReport(): Promise<PenaltyReportRow[]> {
    return [];
  }

  async getDefaultersReport(): Promise<DefaulterReportRow[]> {
    return [];
  }

  async getWithdrawalsReport(): Promise<WithdrawalReportRow[]> {
    return [];
  }

  async getFinancialSummary(): Promise<FinancialSummary> {
    return { totalInflows: 0, totalOutflows: 0, net: 0 };
  }
}
