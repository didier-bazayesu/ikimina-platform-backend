import { vi } from 'vitest';
import type { Mocked } from 'vitest';
import type { PenaltyRepositoryInterface } from './penalty.repository.interface';

export const PenaltyRepositoryMock =
  (): Mocked<PenaltyRepositoryInterface> => ({
    createPenalty: vi.fn(),
    findPenaltyById: vi.fn(),
    findPenaltyByObligationId: vi.fn(),
    listPenalties: vi.fn(),
    updatePenaltyStatus: vi.fn(),
    createPenaltyPayment: vi.fn(),
    findPenaltyPaymentById: vi.fn(),
    listPenaltyPayments: vi.fn(),
    approvePenaltyPaymentAndMarkPaid: vi.fn(),
    rejectPenaltyPayment: vi.fn(),
  });
