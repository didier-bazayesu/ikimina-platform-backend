import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DASHBOARD_REPOSITORY } from './dashboard.interface';
import { MEMBER_REPOSITORY } from '../member/member.repository.interface';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

describe('DashboardService', () => {
  let service: DashboardService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dashboardRepoMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let memberRepoMock: any;

  beforeEach(async () => {
    dashboardRepoMock = {
      getMemberSummary: vi.fn(),
      getAdminSummary: vi.fn(),
    };

    memberRepoMock = {
      findByUserId: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DASHBOARD_REPOSITORY, useValue: dashboardRepoMock },
        { provide: MEMBER_REPOSITORY, useValue: memberRepoMock },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getMemberDashboard', () => {
    it('should return member summary if member is found', async () => {
      const userId = 'user-123';
      const member = { id: 'member-123', userId };
      const summary = {
        totalApprovedContributions: 100,
        totalApprovedPenalties: 10,
        outstandingObligationsCount: 1,
        outstandingObligationsAmount: 50,
        unpaidPenaltiesAmount: 5,
      };

      memberRepoMock.findByUserId.mockResolvedValue(member);
      dashboardRepoMock.getMemberSummary.mockResolvedValue(summary);

      const result = await service.getMemberDashboard(userId);

      expect(memberRepoMock.findByUserId).toHaveBeenCalledWith(userId);
      expect(dashboardRepoMock.getMemberSummary).toHaveBeenCalledWith(
        'member-123',
      );
      expect(result).toEqual(summary);
    });

    it('should throw NotFoundException if member not found', async () => {
      const userId = 'user-123';
      memberRepoMock.findByUserId.mockResolvedValue(null);

      await expect(service.getMemberDashboard(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(dashboardRepoMock.getMemberSummary).not.toHaveBeenCalled();
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin summary', async () => {
      const summary = {
        totalActiveMembers: 10,
        availableBalance: 1000,
        pendingContributionPayments: 2,
        pendingPenaltyPayments: 1,
        totalWithdrawalsCurrentMonth: 100,
      };

      dashboardRepoMock.getAdminSummary.mockResolvedValue(summary);

      const result = await service.getAdminDashboard();

      expect(dashboardRepoMock.getAdminSummary).toHaveBeenCalled();
      expect(result).toEqual(summary);
    });
  });
});
