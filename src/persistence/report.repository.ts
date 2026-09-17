import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import {
  ReportRepositoryInterface,
  ReportFilters,
  ContributionReportRow,
  PenaltyReportRow,
  DefaulterReportRow,
  WithdrawalReportRow,
  FinancialSummary,
} from '../application/report/report.repository.interface';

@Injectable()
export class ReportRepository implements ReportRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly pool: IDatabaseConnection,
  ) {}

  async getContributionsReport(
    filters?: ReportFilters,
  ): Promise<ContributionReportRow[]> {
    const params: unknown[] = [];
    let query = `
      SELECT cp.payment_date as date, cp.amount, m.full_name as member_name, cp.method, cp.status
      FROM contribution_payments cp
      JOIN members m ON cp.member_id = m.id
      WHERE 1=1
    `;

    if (filters?.startDate) {
      params.push(filters.startDate);
      query += ` AND cp.payment_date >= $${params.length}`;
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      query += ` AND cp.payment_date <= $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND cp.status = $${params.length}`;
    }

    const res = await this.pool.query(query, params);
    return res.map((row) => ({
      date: row.date,
      amount: Number(row.amount),
      memberName: row.member_name,
      method: row.method,
      status: row.status,
    }));
  }

  async getPenaltiesReport(
    filters?: ReportFilters,
  ): Promise<PenaltyReportRow[]> {
    const params: unknown[] = [];
    let query = `
      SELECT p.created_at as date, p.amount, m.full_name as member_name, p.status
      FROM penalties p
      JOIN members m ON p.member_id = m.id
      WHERE 1=1
    `;

    if (filters?.startDate) {
      params.push(filters.startDate);
      query += ` AND p.created_at >= $${params.length}`;
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      query += ` AND p.created_at <= $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND p.status = $${params.length}`;
    }

    const res = await this.pool.query(query, params);
    return res.map((row) => ({
      date: row.date,
      amount: Number(row.amount),
      memberName: row.member_name,
      status: row.status,
    }));
  }

  async getDefaultersReport(): Promise<DefaulterReportRow[]> {
    const query = `
      SELECT m.full_name as member_name, m.member_number, COUNT(mo.id) as missing_months, SUM(mo.expected_amount) as amount_owed
      FROM members m
      JOIN monthly_obligations mo ON m.id = mo.member_id
      WHERE mo.status = 'UNPAID'
      GROUP BY m.id
      HAVING COUNT(mo.id) > 0
    `;
    const res = await this.pool.query(query);
    return res.map((row) => ({
      memberName: row.member_name,
      memberNumber: row.member_number,
      missingMonths: Number(row.missing_months),
      amountOwed: Number(row.amount_owed),
    }));
  }

  async getWithdrawalsReport(
    filters?: ReportFilters,
  ): Promise<WithdrawalReportRow[]> {
    const params: unknown[] = [];
    let query = `
      SELECT category, SUM(amount) as total_amount
      FROM withdrawals
      WHERE 1=1
    `;

    if (filters?.startDate) {
      params.push(filters.startDate);
      query += ` AND created_at >= $${params.length}`;
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ` GROUP BY category`;

    const res = await this.pool.query(query, params);
    return res.map((row) => ({
      category: row.category,
      totalAmount: Number(row.total_amount),
    }));
  }

  async getFinancialSummary(
    filters?: ReportFilters,
  ): Promise<FinancialSummary> {
    const params: unknown[] = [];
    let paramsIndex = 1;
    let paymentDateWhere = ``;
    let createdAtWhere = ``;

    if (filters?.startDate) {
      params.push(filters.startDate);
      paymentDateWhere += ` AND payment_date >= $${paramsIndex}`;
      createdAtWhere += ` AND created_at >= $${paramsIndex}`;
      paramsIndex++;
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      paymentDateWhere += ` AND payment_date <= $${paramsIndex}`;
      createdAtWhere += ` AND created_at <= $${paramsIndex}`;
      paramsIndex++;
    }

    const inflowsQuery = `
      SELECT (
        COALESCE((SELECT SUM(amount) FROM contribution_payments WHERE status = 'APPROVED' ${paymentDateWhere}), 0) +
        COALESCE((SELECT SUM(amount) FROM penalties WHERE status = 'PAID' ${createdAtWhere}), 0)
      ) as total_inflows
    `;

    const outflowsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_outflows FROM withdrawals WHERE 1=1 ${createdAtWhere}
    `;

    const inflowsRes = await this.pool.query(inflowsQuery, params);
    const outflowsRes = await this.pool.query(outflowsQuery, params);

    const totalInflows = Number(inflowsRes[0].total_inflows);
    const totalOutflows = Number(outflowsRes[0].total_outflows);

    return {
      totalInflows,
      totalOutflows,
      net: totalInflows - totalOutflows,
    };
  }
}
