import { describe, it, expect, beforeEach } from 'vitest';
import { MonthlyObligationService } from './monthly-obligation.service';
import {
  mockMonthlyObligationRepository,
  createMockMonthlyObligation,
} from './monthly-obligation.repository.mock';
import {
  mockSystemSettingsRepository,
  createMockSystemSettings,
} from '../system-settings/system-settings.repository.mock';
import { createMemberRepositoryMock } from '../member/member.repository.mock';
import { mockTimeProvider } from '../common/time-provider.mock';
import type { Member } from '../member/member';
import type { Mocked } from 'vitest';

const createMockMember = (overrides?: Partial<Member>): Member =>
  ({
    id: 'm1',
    userId: 'u1',
    memberNumber: 'IKM-1',
    fullName: 'Test Member',
    nationalId: null,
    address: 'Kigali',
    joinedDate: new Date(),
    createdAt: new Date(),
    email: 'test@example.com',
    phone: '+250788000000',
    status: 'ACTIVE',
    ...overrides,
  }) as Member;

describe('MonthlyObligationService', () => {
  let service: MonthlyObligationService;
  let repo: ReturnType<typeof mockMonthlyObligationRepository>;
  let settingsRepo: ReturnType<typeof mockSystemSettingsRepository>;
  let memberRepo: Mocked<ReturnType<typeof createMemberRepositoryMock>>;
  let timeProvider: ReturnType<typeof mockTimeProvider>;

  beforeEach(() => {
    repo = mockMonthlyObligationRepository();
    settingsRepo = mockSystemSettingsRepository();
    memberRepo = createMemberRepositoryMock() as Mocked<
      ReturnType<typeof createMemberRepositoryMock>
    >;
    timeProvider = mockTimeProvider();

    service = new MonthlyObligationService(
      repo,
      settingsRepo,
      memberRepo,
      timeProvider,
    );
  });

  describe('generateObligationsForPeriod', () => {
    it('creates obligations for ACTIVE members who joined before the period', async () => {
      settingsRepo.getCurrent.mockResolvedValue(createMockSystemSettings());

      const member1 = createMockMember({ id: 'm1', joinedDate: new Date('2024-01-15') });
      const member2 = createMockMember({ id: 'm2', joinedDate: new Date('2026-03-20') });
      memberRepo.list.mockResolvedValue({
        items: [member1, member2],
        page: 1,
        limit: 100,
        total: 2,
      });
      repo.create.mockResolvedValue(createMockMonthlyObligation());

      await service.generateObligationsForPeriod(2, 2026); // Period: Feb 1, 2026

      // m1 joined Jan 15 (before Feb 1) -> generated
      // m2 joined Feb 10 (after Feb 1) -> skipped
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          month: 2,
          year: 2026,
        }),
      );
    });
  });

  describe('listObligations (and Overdue computation)', () => {
    it('returns items with isOverdue correctly computed from TimeProvider', async () => {
      const ob1 = createMockMonthlyObligation({
        id: '1',
        status: 'UNPAID',
        dueDay: 7,
      });
      const ob2 = createMockMonthlyObligation({
        id: '2',
        status: 'PAID',
        dueDay: 7,
      });

      repo.list.mockResolvedValue({
        items: [ob1, ob2],
        page: 1,
        limit: 20,
        total: 2,
      });

      // timeProvider.isOverdue will return true for the first call (for ob1)
      timeProvider.isOverdue.mockReturnValue(true);

      const result = await service.listObligations({});

      expect(result.items).toHaveLength(2);
      expect(result.items[0].isOverdue).toBe(true);
      // PAID obligations shouldn't theoretically need isOverdue, but we compute it.
      // Wait, our implementation only sets isOverdue if status === 'UNPAID'
      expect(result.items[1].isOverdue).toBe(false);
    });

    it('filters by overdue if specified', async () => {
      const ob1 = createMockMonthlyObligation({
        id: '1',
        status: 'UNPAID',
        dueDay: 7,
      });
      repo.list.mockResolvedValue({
        items: [ob1],
        page: 1,
        limit: 20,
        total: 1,
      });
      timeProvider.isOverdue.mockReturnValue(true); // it IS overdue

      // requesting overdue=false
      const result = await service.listObligations({ overdue: false });
      expect(result.items).toHaveLength(0); // ob1 is overdue, so it is filtered out
    });
  });
});
