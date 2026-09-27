import { Controller, Get, Query, Res, UseGuards, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { ReportQueryDto } from './report-query.dto';
import { REPORT_SERVICE } from '../../application/report/report.service.interface';
import type { ReportServiceInterface } from '../../application/report/report.service.interface';
import { EXPORT_SERVICE } from '../../application/report/export.service.interface';
import type { ExportServiceInterface } from '../../application/report/export.service.interface';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportController {
  constructor(
    @Inject(REPORT_SERVICE)
    private readonly reportService: ReportServiceInterface,
    @Inject(EXPORT_SERVICE)
    private readonly exportService: ExportServiceInterface,
  ) {}

  private async handleExport(
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    format: string,
    title: string,
  ) {
    if (format === 'csv') {
      const csv = this.exportService.generateCsv(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${title.toLowerCase()}.csv`);
      return res.send(csv);
    }
    if (format === 'pdf') {
      const pdf = await this.exportService.generatePdf(title, data);
      res.header('Content-Type', 'application/pdf');
      res.attachment(`${title.toLowerCase()}.pdf`);
      return res.send(pdf);
    }
    return res.json({ success: true, data });
  }

  private mapFilters(dto: ReportQueryDto) {
    return {
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: dto.status,
    };
  }

  @Get('contributions')
  async getContributionsReport(
    @Query() dto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const filters = this.mapFilters(dto);
    const data = await this.reportService.getContributionsReport(filters);
    return this.handleExport(res, data, dto.format, 'Contributions_Report');
  }

  @Get('penalties')
  async getPenaltiesReport(@Query() dto: ReportQueryDto, @Res() res: Response) {
    const filters = this.mapFilters(dto);
    const data = await this.reportService.getPenaltiesReport(filters);
    return this.handleExport(res, data, dto.format, 'Penalties_Report');
  }

  @Get('defaulters')
  async getDefaultersReport(
    @Query() dto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.reportService.getDefaultersReport();
    return this.handleExport(res, data, dto.format, 'Defaulters_Report');
  }

  @Get('withdrawals')
  async getWithdrawalsReport(
    @Query() dto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const filters = this.mapFilters(dto);
    const data = await this.reportService.getWithdrawalsReport(filters);
    return this.handleExport(res, data, dto.format, 'Withdrawals_Report');
  }

  @Get('financial-summary')
  async getFinancialSummary(
    @Query() dto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const filters = this.mapFilters(dto);
    const summary = await this.reportService.getFinancialSummary(filters);
    return this.handleExport(res, [summary], dto.format, 'Financial_Summary');
  }
}
