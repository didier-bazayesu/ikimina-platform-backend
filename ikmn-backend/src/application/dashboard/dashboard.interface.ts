export interface MemberDashboardSummary {
  totalApprovedContributions: number;
  totalApprovedPenalties: number;
  outstandingObligationsCount: number;
  outstandingObligationsAmount: number;
  unpaidPenaltiesAmount: number;
}

export interface PendingApprovalItem {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentDate: Date;
  type: 'Contribution' | 'Penalty';
}

export interface AdminDashboardSummary {
  totalActiveMembers: number;
  availableBalance: number;
  pendingContributionPayments: number;
  pendingPenaltyPayments: number;
  totalWithdrawalsCurrentMonth: number;
  
  totalContributionsAmount: number;
  unpaidPenaltiesAmount: number;
  totalPenaltiesGenerated: number;
  paidObligationsCurrentMonth: number;
  totalObligationsCurrentMonth: number;
  recentPendingApprovals: PendingApprovalItem[];
}

export interface DashboardRepositoryInterface {
  getMemberSummary(memberId: string): Promise<MemberDashboardSummary>;
  getAdminSummary(): Promise<AdminDashboardSummary>;
}

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');
