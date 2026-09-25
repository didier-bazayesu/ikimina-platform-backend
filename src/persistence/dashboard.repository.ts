import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  DashboardRepositoryInterface,
  MemberDashboardSummary,
  AdminDashboardSummary,
} from '../application/dashboard/dashboard.interface';

@Injectable()
export class DashboardRepository implements DashboardRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async getMemberSummary(memberId: string): Promise<MemberDashboardSummary> {
    const [contributionsRes, penaltiesRes, obligationsRes, unpaidPenaltiesRes] =
      await Promise.all([
        this.db.query<{ sum: string }>(
          `SELECT COALESCE(SUM(amount), 0) as sum FROM contribution_payments WHERE member_id = $1 AND status = 'APPROVED'`,
          [memberId],
        ),
        this.db.query<{ sum: string }>(
          `SELECT COALESCE(SUM(pp.amount), 0) as sum FROM penalty_payments pp JOIN penalties p ON pp.penalty_id = p.id WHERE p.member_id = $1 AND pp.status = 'APPROVED'`,
          [memberId],
        ),
        this.db.query<{ count: string; amount: string }>(
          `SELECT COUNT(*) as count, COALESCE(SUM(expected_amount), 0) as amount FROM monthly_obligations WHERE member_id = $1 AND status = 'UNPAID'`,
          [memberId],
        ),
        this.db.query<{ sum: string }>(
          `SELECT COALESCE(SUM(amount), 0) as sum FROM penalties WHERE member_id = $1 AND status IN ('UNPAID', 'PENDING')`,
          [memberId],
        ),
      ]);

    return {
      totalApprovedContributions: Number(contributionsRes[0]?.sum || 0),
      totalApprovedPenalties: Number(penaltiesRes[0]?.sum || 0),
      outstandingObligationsCount: Number(obligationsRes[0]?.count || 0),
      outstandingObligationsAmount: Number(obligationsRes[0]?.amount || 0),
      unpaidPenaltiesAmount: Number(unpaidPenaltiesRes[0]?.sum || 0),
    };
  }

  async getAdminSummary(): Promise<AdminDashboardSummary> {
    const [
      activeMembersRes,
      balanceRes,
      pendingContributionsRes,
      pendingPenaltiesRes,
      withdrawalsRes,
    ] = await Promise.all([
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM members m JOIN users u ON m.user_id = u.id WHERE u.status = 'ACTIVE'`,
        [],
      ),
      this.db.query<{ balance: string }>(
        `
        WITH unified_ledger AS (
          SELECT -amount AS amount FROM withdrawals
          UNION ALL
          SELECT cp.amount AS amount FROM contribution_payments cp WHERE cp.status = 'APPROVED'
          UNION ALL
          SELECT pp.amount AS amount FROM penalty_payments pp JOIN penalties p ON pp.penalty_id = p.id WHERE pp.status = 'APPROVED'
        )
        SELECT COALESCE(SUM(amount), 0) as balance FROM unified_ledger
        `,
        [],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM contribution_payments WHERE status = 'PENDING'`,
        [],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM penalty_payments WHERE status = 'PENDING'`,
        [],
      ),
      this.db.query<{ sum: string }>(
        `SELECT COALESCE(SUM(amount), 0) as sum FROM withdrawals WHERE EXTRACT(MONTH FROM withdrawal_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM withdrawal_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [],
      ),
    ]);

    return {
      totalActiveMembers: Number(activeMembersRes[0]?.count || 0),
      availableBalance: Number(balanceRes[0]?.balance || 0),
      pendingContributionPayments: Number(
        pendingContributionsRes[0]?.count || 0,
      ),
      pendingPenaltyPayments: Number(pendingPenaltiesRes[0]?.count || 0),
      totalWithdrawalsCurrentMonth: Number(withdrawalsRes[0]?.sum || 0),
    };
  }
}
