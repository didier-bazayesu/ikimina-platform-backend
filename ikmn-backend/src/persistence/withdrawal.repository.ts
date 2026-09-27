import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  WithdrawalRepositoryInterface,
  CreateWithdrawalParams,
  ListWithdrawalsFilter,
  ListWithdrawalsResult,
} from '../application/withdrawal/withdrawal.repository.interface';
import type { Withdrawal } from '../application/withdrawal/withdrawal';
import type { WithdrawalCategory } from '../application/withdrawal/withdrawal-category';

interface WithdrawalRow {
  id: string;
  amount: string;
  withdrawal_date: string;
  beneficiary: string;
  category: WithdrawalCategory;
  description: string;
  supporting_doc_url: string | null;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

function toWithdrawalDomain(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    amount: parseFloat(row.amount),
    withdrawalDate: new Date(row.withdrawal_date),
    beneficiary: row.beneficiary,
    category: row.category,
    description: row.description,
    supportingDocUrl: row.supporting_doc_url || undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    creatorName: row.creator_name,
  };
}

@Injectable()
export class WithdrawalRepository implements WithdrawalRepositoryInterface {
  private readonly logger = new Logger(WithdrawalRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(params: CreateWithdrawalParams): Promise<Withdrawal> {
    const rows = await this.db.query<WithdrawalRow>(
      `WITH inserted AS (
         INSERT INTO withdrawals (amount, withdrawal_date, beneficiary, category, description, supporting_doc_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *
       )
       SELECT i.*, u.email AS creator_name
       FROM inserted i
       JOIN users u ON i.created_by = u.id`,
      [
        params.amount,
        params.withdrawalDate,
        params.beneficiary,
        params.category,
        params.description,
        params.supportingDocUrl || null,
        params.createdBy,
      ],
    );
    return toWithdrawalDomain(rows[0]);
  }

  async list(filter: ListWithdrawalsFilter): Promise<ListWithdrawalsResult> {
    const { page, limit, category, startDate, endDate } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (category) {
      params.push(category);
      conditions.push(`w.category = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      conditions.push(`w.withdrawal_date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`w.withdrawal_date <= $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM withdrawals w ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<WithdrawalRow>(
      `SELECT w.*, u.email AS creator_name
       FROM withdrawals w
       JOIN users u ON w.created_by = u.id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map(toWithdrawalDomain),
      page,
      limit,
      total,
    };
  }
}
