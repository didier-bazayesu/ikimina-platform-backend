import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from './dashboard.interface';
import type {
  DashboardRepositoryInterface,
  MemberDashboardSummary,
  AdminDashboardSummary,
} from './dashboard.interface';
import { MEMBER_REPOSITORY } from '../member/member.repository.interface';
import type { MemberRepositoryInterface } from '../member/member.repository.interface';
import type { DashboardServiceInterface } from './dashboard.service.interface';

@Injectable()
export class DashboardService implements DashboardServiceInterface {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryInterface,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepository: MemberRepositoryInterface,
  ) {}

  async getMemberDashboard(userId: string): Promise<MemberDashboardSummary> {
    const member = await this.memberRepository.findByUserId(userId);
    if (!member) {
      throw new NotFoundException('Member profile not found for this user');
    }
    return this.dashboardRepository.getMemberSummary(member.id);
  }

  async getAdminDashboard(): Promise<AdminDashboardSummary> {
    return this.dashboardRepository.getAdminSummary();
  }
}
