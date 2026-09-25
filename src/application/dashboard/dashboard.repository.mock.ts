import { vi, Mocked } from 'vitest';
import { DashboardRepositoryInterface } from './dashboard.interface';

export const mockDashboardRepository =
  (): Mocked<DashboardRepositoryInterface> => ({
    getMemberSummary: vi.fn(),
    getAdminSummary: vi.fn(),
  });
