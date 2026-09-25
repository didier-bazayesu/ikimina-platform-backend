import { Injectable, Inject } from '@nestjs/common';
import { REPORT_REPOSITORY } from './report.repository.interface';
import type {
  ReportRepositoryInterface,
  ReportFilters,
  ContributionReportRow,
  PenaltyReportRow,
  DefaulterReportRow,
  WithdrawalReportRow,
  FinancialSummary,
} from './report.repository.interface';
import type { ReportServiceInterface } from './report.service.interface';

@Injectable()
export class ReportService implements ReportServiceInterface {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepositoryInterface,
  ) {}

  async getContributionsReport(
    filters?: ReportFilters,
  ): Promise<ContributionReportRow[]> {
    return this.reportRepository.getContributionsReport(filters);
  }

  async getPenaltiesReport(
    filters?: ReportFilters,
  ): Promise<PenaltyReportRow[]> {
    return this.reportRepository.getPenaltiesReport(filters);
  }

  async getDefaultersReport(): Promise<DefaulterReportRow[]> {
    return this.reportRepository.getDefaultersReport();
  }

  async getWithdrawalsReport(
    filters?: ReportFilters,
  ): Promise<WithdrawalReportRow[]> {
    return this.reportRepository.getWithdrawalsReport(filters);
  }

  async getFinancialSummary(
    filters?: ReportFilters,
  ): Promise<FinancialSummary> {
    return this.reportRepository.getFinancialSummary(filters);
  }
}
