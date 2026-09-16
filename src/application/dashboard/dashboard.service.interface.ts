import type {
  MemberDashboardSummary,
  AdminDashboardSummary,
} from './dashboard.interface';

export interface DashboardServiceInterface {
  getMemberDashboard(userId: string): Promise<MemberDashboardSummary>;
  getAdminDashboard(): Promise<AdminDashboardSummary>;
}

export const DASHBOARD_SERVICE = Symbol('DASHBOARD_SERVICE');
