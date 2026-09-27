import { Injectable, Inject } from '@nestjs/common';
import {
  StatementData,
  StatementFilters,
  StatementRepositoryInterface,
  StatementRow,
} from '../application/statement/statement.repository.interface';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';

@Injectable()
export class StatementRepository implements StatementRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: IDatabaseConnection,
  ) {}

  async getStatement(
    memberId: string,
    filters?: StatementFilters,
  ): Promise<StatementData> {
    // 1. Fetch member details
    const memberResult = await this.db.query(
      `SELECT full_name, member_number FROM members WHERE id = $1`,
      [memberId],
    );

    if (memberResult.length === 0) {
      throw new Error(`Member with ID ${memberId} not found`);
    }

    const member = memberResult[0];
    const memberName = member.full_name;
    const memberNumber = member.member_number;

    // 2. Build the UNION ALL query
    const timelineCte = `
      SELECT created_at as date, 'Monthly Obligation' as description, -expected_amount as amount
      FROM monthly_obligations
      WHERE member_id = $1

      UNION ALL

      SELECT created_at as date, 'Penalty' as description, -amount as amount
      FROM penalties
      WHERE member_id = $1

      UNION ALL

      SELECT payment_date as date, 'Contribution Payment' as description, amount
      FROM contribution_payments
      WHERE member_id = $1 AND status = 'APPROVED'

      UNION ALL

      SELECT pp.payment_date as date, 'Penalty Payment' as description, pp.amount
      FROM penalty_payments pp
      JOIN penalties p ON pp.penalty_id = p.id
      WHERE p.member_id = $1 AND pp.status = 'APPROVED'
    `;

    // 3. Calculate opening balance
    let openingBalance = 0;
    if (filters?.startDate) {
      const openingBalanceQuery = `
        WITH timeline_cte AS (${timelineCte})
        SELECT SUM(amount) as balance
        FROM timeline_cte
        WHERE date < $2
      `;
      const openingBalanceResult = await this.db.query(openingBalanceQuery, [
        memberId,
        filters.startDate,
      ]);
      openingBalance = Number(openingBalanceResult[0]?.balance || 0);
    }

    // 4. Fetch transactions
    let transactionsQuery = `
      WITH timeline_cte AS (${timelineCte})
      SELECT date, description, amount
      FROM timeline_cte
      WHERE 1=1
    `;

    const params: unknown[] = [memberId];

    if (filters?.startDate) {
      params.push(filters.startDate);
      transactionsQuery += ` AND date >= $${params.length}`;
    }

    if (filters?.endDate) {
      params.push(filters.endDate);
      transactionsQuery += ` AND date <= $${params.length}`;
    }

    transactionsQuery += ` ORDER BY date ASC`;

    const transactionsResult = await this.db.query(transactionsQuery, params);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions: StatementRow[] = transactionsResult.map((row: any) => ({
      date: row.date,
      description: row.description,
      amount: Number(row.amount),
    }));

    // 5. Calculate closing balance
    const closingBalance =
      openingBalance + transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      member: {
        name: memberName,
        number: memberNumber,
      },
      period: {
        start: filters?.startDate,
        end: filters?.endDate,
      },
      openingBalance,
      closingBalance,
      transactions,
    };
  }
}
