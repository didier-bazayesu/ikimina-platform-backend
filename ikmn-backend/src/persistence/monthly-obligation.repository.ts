import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  CreateMonthlyObligationParams,
  ListObligationsFilter,
  ListObligationsResult,
  MonthlyObligationRepositoryInterface,
} from '../application/monthly-obligation/monthly-obligation.repository.interface';
import { MONTHLY_OBLIGATION_REPOSITORY } from '../application/monthly-obligation/monthly-obligation.repository.interface';
import type {
  MonthlyObligation,
  MonthlyObligationStatus,
} from '../application/monthly-obligation/monthly-obligation';

interface ObligationRow {
  id: string;
  member_id: string;
  month: number;
  year: number;
  expected_amount: string;
  due_day: number;
  currency: string;
  status: MonthlyObligationStatus;
  created_at: string;
}

function toDomain(row: ObligationRow): MonthlyObligation {
  return {
    id: row.id,
    memberId: row.member_id,
    month: row.month,
    year: row.year,
    expectedAmount: parseFloat(row.expected_amount),
    dueDay: row.due_day,
    currency: row.currency,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

@Injectable()
export class MonthlyObligationRepository implements MonthlyObligationRepositoryInterface {
  private readonly logger = new Logger(MonthlyObligationRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(
    params: CreateMonthlyObligationParams,
  ): Promise<MonthlyObligation | null> {
    try {
      const rows = await this.db.query<ObligationRow>(
        `INSERT INTO monthly_obligations 
         (member_id, month, year, expected_amount, due_day, currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (member_id, month, year) DO NOTHING
         RETURNING *`,
        [
          params.memberId,
          params.month,
          params.year,
          params.expectedAmount,
          params.dueDay,
          params.currency,
        ],
      );

      return rows[0] ? toDomain(rows[0]) : null;
    } catch (error) {
      this.logger.error(
        `Failed to create obligation: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async findByMemberAndPeriod(
    memberId: string,
    month: number,
    year: number,
  ): Promise<MonthlyObligation | null> {
    const rows = await this.db.query<ObligationRow>(
      `SELECT * FROM monthly_obligations WHERE member_id = $1 AND month = $2 AND year = $3`,
      [memberId, month, year],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async list(filter: ListObligationsFilter): Promise<ListObligationsResult> {
    const { page, limit, status, memberId, month, year } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (memberId) {
      params.push(memberId);
      conditions.push(`member_id = $${params.length}`);
    }
    if (month) {
      params.push(month);
      conditions.push(`month = $${params.length}`);
    }
    if (year) {
      params.push(year);
      conditions.push(`year = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM monthly_obligations ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<ObligationRow>(
      `SELECT * FROM monthly_obligations ${where}
       ORDER BY year DESC, month DESC, created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows.map(toDomain), page, limit, total };
  }

  async markPaid(id: string): Promise<MonthlyObligation | null> {
    const rows = await this.db.query<ObligationRow>(
      `UPDATE monthly_obligations SET status = 'PAID' WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }
  async listUnpaidForMembers(memberIds: string[]): Promise<MonthlyObligation[]> {
    if (memberIds.length === 0) return [];
    
    const rows = await this.db.query<ObligationRow>(
      `SELECT * FROM monthly_obligations WHERE member_id = ANY($1) AND status = 'UNPAID'`,
      [memberIds],
    );
    return rows.map(toDomain);
  }

  async countPaidForMembers(memberIds: string[]): Promise<Map<string, number>> {
    if (memberIds.length === 0) return new Map();

    const rows = await this.db.query<{ member_id: string; count: string }>(
      `SELECT member_id, COUNT(*) as count FROM monthly_obligations WHERE member_id = ANY($1) AND status = 'PAID' GROUP BY member_id`,
      [memberIds],
    );

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.member_id, parseInt(row.count, 10));
    }
    return counts;
  }
}

export { MONTHLY_OBLIGATION_REPOSITORY };
