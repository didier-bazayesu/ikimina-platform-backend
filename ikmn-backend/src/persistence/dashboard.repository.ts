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
      totalContributionsRes,
      unpaidPenaltiesRes,
      totalPenaltiesRes,
      paidObligationsRes,
      totalObligationsRes,
      recentApprovalsRes
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
      this.db.query<{ sum: string }>(
        `SELECT COALESCE(SUM(amount), 0) as sum FROM contribution_payments WHERE status = 'APPROVED'`,
        [],
      ),
      this.db.query<{ sum: string }>(
        `SELECT COALESCE(SUM(amount), 0) as sum FROM penalties WHERE status = 'UNPAID'`,
        [],
      ),
      this.db.query<{ sum: string }>(
        `SELECT COALESCE(SUM(amount), 0) as sum FROM penalties`,
        [],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM monthly_obligations WHERE status = 'PAID' AND month = EXTRACT(MONTH FROM CURRENT_DATE) AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM monthly_obligations WHERE month = EXTRACT(MONTH FROM CURRENT_DATE) AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [],
      ),
      this.db.query<{ id: string; member_id: string; full_name: string; amount: string; payment_date: Date; type: 'Contribution' | 'Penalty' }>(
        `
        WITH pending AS (
          SELECT cp.id, cp.member_id, cp.amount, cp.payment_date, 'Contribution' as type 
          FROM contribution_payments cp WHERE cp.status = 'PENDING'
          UNION ALL
          SELECT pp.id, p.member_id, pp.amount, pp.payment_date, 'Penalty' as type 
          FROM penalty_payments pp 
          JOIN penalties p ON pp.penalty_id = p.id
          WHERE pp.status = 'PENDING'
        )
        SELECT p.id, p.member_id, m.full_name, p.amount, p.payment_date, p.type 
        FROM pending p
        JOIN members m ON p.member_id = m.id
        JOIN users u ON m.user_id = u.id
        ORDER BY p.payment_date DESC
        LIMIT 5
        `,
        [],
      ),
    ]);

    return {
      totalActiveMembers: Number(activeMembersRes[0]?.count || 0),
      availableBalance: Number(balanceRes[0]?.balance || 0),
      pendingContributionPayments: Number(pendingContributionsRes[0]?.count || 0),
      pendingPenaltyPayments: Number(pendingPenaltiesRes[0]?.count || 0),
      totalWithdrawalsCurrentMonth: Number(withdrawalsRes[0]?.sum || 0),
      
      totalContributionsAmount: Number(totalContributionsRes[0]?.sum || 0),
      unpaidPenaltiesAmount: Number(unpaidPenaltiesRes[0]?.sum || 0),
      totalPenaltiesGenerated: Number(totalPenaltiesRes[0]?.sum || 0),
      paidObligationsCurrentMonth: Number(paidObligationsRes[0]?.count || 0),
      totalObligationsCurrentMonth: Number(totalObligationsRes[0]?.count || 0),
      recentPendingApprovals: recentApprovalsRes.map(row => ({
        id: row.id,
        memberId: row.member_id,
        memberName: row.full_name,
        amount: Number(row.amount),
        paymentDate: row.payment_date,
        type: row.type,
      })),
    };
  }
}
