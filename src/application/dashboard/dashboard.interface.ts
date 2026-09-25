export interface MemberDashboardSummary {
  totalApprovedContributions: number;
  totalApprovedPenalties: number;
  outstandingObligationsCount: number;
  outstandingObligationsAmount: number;
  unpaidPenaltiesAmount: number;
}

export interface AdminDashboardSummary {
  totalActiveMembers: number;
  availableBalance: number;
  pendingContributionPayments: number;
  pendingPenaltyPayments: number;
  totalWithdrawalsCurrentMonth: number;
}

export interface DashboardRepositoryInterface {
  getMemberSummary(memberId: string): Promise<MemberDashboardSummary>;
  getAdminSummary(): Promise<AdminDashboardSummary>;
}

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');
