import { vi } from 'vitest';
import type { Mocked } from 'vitest';
import type { MonthlyObligationRepositoryInterface } from './monthly-obligation.repository.interface';
import type { MonthlyObligation } from './monthly-obligation';

export const mockMonthlyObligationRepository =
  (): Mocked<MonthlyObligationRepositoryInterface> => ({
    create: vi.fn(),
    list: vi.fn(),
    findByMemberAndPeriod: vi.fn(),
    markPaid: vi.fn(),
  });

export const createMockMonthlyObligation = (
  overrides?: Partial<MonthlyObligation>,
): MonthlyObligation => ({
  id: 'ob-123',
  memberId: 'member-123',
  month: 1,
  year: 2026,
  expectedAmount: 20000,
  dueDay: 7,
  currency: 'RWF',
  status: 'UNPAID',
  createdAt: new Date(),
  ...overrides,
});
