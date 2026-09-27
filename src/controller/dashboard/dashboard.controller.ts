import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import type { DashboardServiceInterface } from '../../application/dashboard/dashboard.service.interface';
import { DASHBOARD_SERVICE } from '../../application/dashboard/dashboard.service.interface';
import { JwtAuthGuard } from '../authentication.guard';
import type { AuthenticatedUser } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CurrentUser } from '../current-user.decorator';
import type {
  MemberDashboardSummary,
  AdminDashboardSummary,
} from '../../application/dashboard/dashboard.interface';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    @Inject(DASHBOARD_SERVICE)
    private readonly dashboardService: DashboardServiceInterface,
  ) {}

  @Get('member')
  @Roles('MEMBER')
  async getMemberDashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDashboardSummary> {
    return this.dashboardService.getMemberDashboard(user.id);
  }

  @Get('admin')
  @Roles('ADMIN')
  async getAdminDashboard(): Promise<AdminDashboardSummary> {
    return this.dashboardService.getAdminDashboard();
  }
}
