import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mocked } from 'vitest';
import { PenaltyService } from './penalty.service';
import type { PenaltyRepositoryInterface } from './penalty.repository.interface';
import type {
  MonthlyObligationRepositoryInterface,
  ListObligationsResult,
} from '../monthly-obligation/monthly-obligation.repository.interface';
import type { SystemSettingsRepositoryInterface } from '../system-settings/system-settings.repository.interface';
import type { StorageAdapterInterface } from '../common/storage.interface';
import type { TimeProviderInterface } from '../common/time-provider.interface';
import { NotFoundException } from '@nestjs/common';
import type { Penalty } from './penalty';

describe('PenaltyService', () => {
  let service: PenaltyService;
  let penaltyRepo: Mocked<PenaltyRepositoryInterface>;
  let obligationRepo: Mocked<MonthlyObligationRepositoryInterface>;
  let settingsRepo: Mocked<SystemSettingsRepositoryInterface>;
  let storageAdapter: Mocked<StorageAdapterInterface>;
  let timeProvider: Mocked<TimeProviderInterface>;

  beforeEach(() => {
    penaltyRepo = {
      findPenaltyByObligationId: vi.fn(),
      createPenalty: vi.fn(),
      findPenaltyById: vi.fn(),
      updatePenaltyStatus: vi.fn(),
      createPenaltyPayment: vi.fn(),
      findPenaltyPaymentById: vi.fn(),
      listPenalties: vi.fn(),
      listPenaltyPayments: vi.fn(),
      approvePenaltyPaymentAndMarkPaid: vi.fn(),
      rejectPenaltyPayment: vi.fn(),
    } as unknown as Mocked<PenaltyRepositoryInterface>;

    obligationRepo = {
      list: vi.fn(),
      create: vi.fn(),
      findByMemberAndPeriod: vi.fn(),
      markPaid: vi.fn(),
    } as unknown as Mocked<MonthlyObligationRepositoryInterface>;

    settingsRepo = {
      getCurrent: vi.fn(),
      update: vi.fn(),
    } as unknown as Mocked<SystemSettingsRepositoryInterface>;

    storageAdapter = {
      upload: vi.fn(),
    } as unknown as Mocked<StorageAdapterInterface>;

    timeProvider = {
      now: vi.fn(),
      isOverdue: vi.fn(),
    } as unknown as Mocked<TimeProviderInterface>;

    service = new PenaltyService(
      penaltyRepo,
      obligationRepo,
      settingsRepo,
      storageAdapter,
      timeProvider,
    );
  });

  it('generates penalties for overdue obligations', async () => {
    settingsRepo.getCurrent.mockResolvedValue({
      dueDay: 7,
      penaltyPercentage: 10,
    } as never);

    timeProvider.now.mockReturnValue(new Date('2026-09-10'));
    timeProvider.isOverdue.mockReturnValue(true);

    obligationRepo.list.mockResolvedValue({
      items: [
        {
          id: 'ob-1',
          memberId: 'mem-1',
          expectedAmount: 2000,
          month: 9,
          year: 2026,
        },
      ],
      total: 1,
      page: 1,
      limit: 10000,
    } as unknown as ListObligationsResult);

    penaltyRepo.findPenaltyByObligationId.mockResolvedValue(null);

    penaltyRepo.createPenalty.mockResolvedValue({
      id: 'pen-1',
    } as never);

    await service.generatePenaltiesForOverdueObligations();

    expect(penaltyRepo.createPenalty).toHaveBeenCalledWith({
      memberId: 'mem-1',
      monthlyObligationId: 'ob-1',
      amount: 200,
    });
  });

  it('does not duplicate penalties (idempotent)', async () => {
    settingsRepo.getCurrent.mockResolvedValue({
      dueDay: 7,
      penaltyPercentage: 10,
    } as never);

    timeProvider.now.mockReturnValue(new Date('2026-09-10'));
    timeProvider.isOverdue.mockReturnValue(true);

    obligationRepo.list.mockResolvedValue({
      items: [
        {
          id: 'ob-1',
          memberId: 'mem-1',
          expectedAmount: 2000,
          month: 9,
          year: 2026,
        },
      ],
      total: 1,
      page: 1,
      limit: 10000,
    } as unknown as ListObligationsResult);

    penaltyRepo.findPenaltyByObligationId.mockResolvedValue({
      id: 'existing-pen-1',
    } as never);

    await service.generatePenaltiesForOverdueObligations();

    expect(penaltyRepo.createPenalty).not.toHaveBeenCalled();
  });

  it('submits a penalty payment successfully', async () => {
    const penalty: Penalty = {
      id: 'pen-1',
      memberId: 'mem-1',
      monthlyObligationId: 'ob-1',
      amount: 200,
      status: 'UNPAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    penaltyRepo.findPenaltyById.mockResolvedValue(penalty);

    timeProvider.now.mockReturnValue(new Date('2026-09-10'));

    storageAdapter.upload.mockResolvedValue('http://example.com/proof.pdf');

    penaltyRepo.createPenaltyPayment.mockResolvedValue({
      id: 'pay-1',
      status: 'PENDING',
    } as never);

    const result = await service.submitPenaltyPayment({
      memberId: 'mem-1',
      penaltyId: 'pen-1',
      amount: 200,
      paymentDate: new Date('2026-09-09'),
      method: 'CASH',
      file: {
        originalname: 'proof.pdf',
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
      },
    });

    expect(result.id).toBe('pay-1');

    expect(penaltyRepo.updatePenaltyStatus).toHaveBeenCalledWith(
      'pen-1',
      'PENDING',
    );
  });

  it('rejects submission if penalty does not belong to caller', async () => {
    const penalty: Penalty = {
      id: 'pen-1',
      memberId: 'mem-2',
      monthlyObligationId: 'ob-1',
      amount: 200,
      status: 'UNPAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    penaltyRepo.findPenaltyById.mockResolvedValue(penalty);

    await expect(
      service.submitPenaltyPayment({
        memberId: 'mem-1',
        penaltyId: 'pen-1',
        amount: 200,
        paymentDate: new Date('2026-09-09'),
        method: 'CASH',
        file: {
          originalname: 'proof.pdf',
          buffer: Buffer.from('test'),
          mimetype: 'application/pdf',
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('waives a penalty successfully', async () => {
    const penalty: Penalty = {
      id: 'pen-1',
      memberId: 'mem-1',
      monthlyObligationId: 'ob-1',
      amount: 200,
      status: 'UNPAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    penaltyRepo.findPenaltyById.mockResolvedValue(penalty);

    penaltyRepo.updatePenaltyStatus.mockResolvedValue({
      ...penalty,
      status: 'WAIVED',
    });

    const result = await service.waivePenalty('pen-1');

    expect(result.status).toBe('WAIVED');
  });
});
