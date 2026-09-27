import { Inject, Injectable } from '@nestjs/common';
import type {
  TransactionRepositoryInterface,
  ListTransactionsFilter,
  ListTransactionsResult,
} from '../application/transaction/transaction.repository.interface';
import type { Transaction } from '../application/transaction/transaction';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type { TransactionType } from '../application/transaction/transaction-type';

@Injectable()
export class TransactionRepository implements TransactionRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  private get baseUnifiedLedgerQuery() {
    return `
      WITH unified_ledger AS (
        SELECT
          id AS transaction_id,
          'WITHDRAWAL' AS type,
          -amount AS amount,
          NULL::uuid AS member_id,
          withdrawal_date AS date,
          description AS reference,
          created_at
        FROM withdrawals
        UNION ALL
        SELECT
          cp.id AS transaction_id,
          'CONTRIBUTION' AS type,
          cp.amount AS amount,
          cp.member_id AS member_id,
          cp.payment_date AS date,
          cp.reference AS reference,
          cp.created_at
        FROM contribution_payments cp
        WHERE cp.status = 'APPROVED'
        UNION ALL
        SELECT
          pp.id AS transaction_id,
          'PENALTY' AS type,
          pp.amount AS amount,
          p.member_id AS member_id,
          pp.payment_date AS date,
          pp.reference AS reference,
          pp.created_at
        FROM penalty_payments pp
        JOIN penalties p ON pp.penalty_id = p.id
        WHERE pp.status = 'APPROVED'
      )
    `;
  }

  async list(filter: ListTransactionsFilter): Promise<ListTransactionsResult> {
    let query =
      this.baseUnifiedLedgerQuery + ` SELECT * FROM unified_ledger WHERE 1=1 `;
    let countQuery =
      this.baseUnifiedLedgerQuery +
      ` SELECT COUNT(*) as total FROM unified_ledger WHERE 1=1 `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.memberId) {
      query += ` AND member_id = $${paramIndex} `;
      countQuery += ` AND member_id = $${paramIndex} `;
      params.push(filter.memberId);
      paramIndex++;
    }

    if (filter.type) {
      query += ` AND type = $${paramIndex} `;
      countQuery += ` AND type = $${paramIndex} `;
      params.push(filter.type);
      paramIndex++;
    }

    if (filter.startDate) {
      query += ` AND date >= $${paramIndex} `;
      countQuery += ` AND date >= $${paramIndex} `;
      params.push(filter.startDate);
      paramIndex++;
    }

    if (filter.endDate) {
      query += ` AND date <= $${paramIndex} `;
      countQuery += ` AND date <= $${paramIndex} `;
      params.push(filter.endDate);
      paramIndex++;
    }

    const offset = (filter.page - 1) * filter.limit;

    query += ` ORDER BY created_at DESC, transaction_id LIMIT $${paramIndex} OFFSET $${paramIndex + 1} `;

    const queryParams = [...params, filter.limit, offset];

    const [rows, countRows] = await Promise.all([
      this.db.query(query, queryParams),
      this.db.query(countQuery, params),
    ]);

    const total = parseInt(countRows[0].total, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: Transaction[] = rows.map((row: any) => ({
      id: row.transaction_id,
      type: row.type as TransactionType,
      amount: Number(row.amount),
      memberId: row.member_id,
      date: new Date(row.date),
      reference: row.reference,
      createdAt: new Date(row.created_at),
    }));

    return {
      items,
      page: filter.page,
      limit: filter.limit,
      total,
    };
  }

  async calculateAvailableBalance(): Promise<number> {
    const query =
      this.baseUnifiedLedgerQuery +
      ` SELECT SUM(amount) as balance FROM unified_ledger `;
    const rows = await this.db.query(query, []);
    const balance = rows[0]?.balance;
    return balance ? Number(balance) : 0;
  }
}
