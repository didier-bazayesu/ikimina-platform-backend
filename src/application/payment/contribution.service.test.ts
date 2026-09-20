import { describe, it, expect, beforeEach } from 'vitest';
import { ContributionService } from './contribution.service';
import { ContributionRepositoryMock } from './contribution.repository.mock';
import { StorageAdapterMock } from '../../persistence/storage.mock';
import type { MonthlyObligationRepositoryInterface } from '../monthly-obligation/monthly-obligation.repository.interface';
import type { MonthlyObligation } from '../monthly-obligation/monthly-obligation';
import { BadRequestException } from '@nestjs/common';

class MockObligationRepository implements MonthlyObligationRepositoryInterface {
  public obligations: MonthlyObligation[] = [];

  async create(): Promise<MonthlyObligation | null> {
    return null;
  }
  async list(): Promise<{
    items: MonthlyObligation[];
    page: number;
    limit: number;
    total: number;
  }> {
    return {
      items: this.obligations,
      page: 1,
      limit: 1000,
      total: this.obligations.length,
    };
  }
  async findByMemberAndPeriod(): Promise<MonthlyObligation | null> {
    return null;
  }
  async markPaid(id: string): Promise<MonthlyObligation | null> {
    const found = this.obligations.find((o) => o.id === id);
    if (found) {
      found.status = 'PAID';
      return found;
    }
    return null;
  }
}

describe('ContributionService', () => {
  let service: ContributionService;
  let repoMock: ContributionRepositoryMock;
  let obligationRepoMock: MockObligationRepository;

  beforeEach(() => {
    repoMock = new ContributionRepositoryMock();
    obligationRepoMock = new MockObligationRepository();
    const storageMock = new StorageAdapterMock();

    service = new ContributionService(
      repoMock,
      obligationRepoMock,
      storageMock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { emit: () => true } as any,
    );
  });

  it('submits a contribution payment successfully (single month)', async () => {
    const ob: MonthlyObligation = {
      id: 'ob-1',
      memberId: 'mem-1',
      month: 9,
      year: 2026,
      expectedAmount: 20000,
      dueDay: 7,
      currency: 'RWF',
      status: 'UNPAID',
      createdAt: new Date(),
    };
    obligationRepoMock.obligations.push(ob);

    const result = await service.submitPayment({
      memberId: 'mem-1',
      obligationIds: ['ob-1'],
      amount: 20000,
      paymentDate: new Date('2026-09-05'),
      method: 'MOMO',
      reference: 'MOMO-123',
      file: {
        originalname: 'proof.pdf',
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
      },
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.amount).toBe(20000);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].monthlyObligationId).toBe('ob-1');
  });

  it('rejects submission if amount does not match expected amount', async () => {
    const ob: MonthlyObligation = {
      id: 'ob-1',
      memberId: 'mem-1',
      month: 9,
      year: 2026,
      expectedAmount: 20000,
      dueDay: 7,
      currency: 'RWF',
      status: 'UNPAID',
      createdAt: new Date(),
    };
    obligationRepoMock.obligations.push(ob);

    await expect(
      service.submitPayment({
        memberId: 'mem-1',
        obligationIds: ['ob-1'],
        amount: 15000,
        paymentDate: new Date('2026-09-05'),
        method: 'MOMO',
        reference: 'MOMO-123',
        file: {
          originalname: 'proof.pdf',
          buffer: Buffer.from('test'),
          mimetype: 'application/pdf',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects submission if MOMO has no reference', async () => {
    const ob: MonthlyObligation = {
      id: 'ob-1',
      memberId: 'mem-1',
      month: 9,
      year: 2026,
      expectedAmount: 20000,
      dueDay: 7,
      currency: 'RWF',
      status: 'UNPAID',
      createdAt: new Date(),
    };
    obligationRepoMock.obligations.push(ob);

    await expect(
      service.submitPayment({
        memberId: 'mem-1',
        obligationIds: ['ob-1'],
        amount: 20000,
        paymentDate: new Date('2026-09-05'),
        method: 'MOMO',
        reference: '',
        file: {
          originalname: 'proof.pdf',
          buffer: Buffer.from('test'),
          mimetype: 'application/pdf',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('approves a pending payment', async () => {
    const ob: MonthlyObligation = {
      id: 'ob-1',
      memberId: 'mem-1',
      month: 9,
      year: 2026,
      expectedAmount: 20000,
      dueDay: 7,
      currency: 'RWF',
      status: 'UNPAID',
      createdAt: new Date(),
    };
    obligationRepoMock.obligations.push(ob);

    const payment = await service.submitPayment({
      memberId: 'mem-1',
      obligationIds: ['ob-1'],
      amount: 20000,
      paymentDate: new Date('2026-09-05'),
      method: 'MOMO',
      reference: 'MOMO-123',
      file: {
        originalname: 'proof.pdf',
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
      },
    });

    const approved = await service.approvePayment(payment.id, 'admin-user-id');
    expect(approved.status).toBe('APPROVED');
  });

  it('rejects a pending payment with a reason', async () => {
    const ob: MonthlyObligation = {
      id: 'ob-1',
      memberId: 'mem-1',
      month: 9,
      year: 2026,
      expectedAmount: 20000,
      dueDay: 7,
      currency: 'RWF',
      status: 'UNPAID',
      createdAt: new Date(),
    };
    obligationRepoMock.obligations.push(ob);

    const payment = await service.submitPayment({
      memberId: 'mem-1',
      obligationIds: ['ob-1'],
      amount: 20000,
      paymentDate: new Date('2026-09-05'),
      method: 'MOMO',
      reference: 'MOMO-123',
      file: {
        originalname: 'proof.pdf',
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
      },
    });

    const rejected = await service.rejectPayment(
      payment.id,
      'Invalid reference number',
      'admin-user-id',
    );
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Invalid reference number');
    expect(ob.status).toBe('UNPAID');
  });
});
