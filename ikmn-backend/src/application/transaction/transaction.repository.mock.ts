import { vi } from 'vitest';
import type { TransactionRepositoryInterface } from './transaction.repository.interface';

export const mockTransactionRepository =
  (): TransactionRepositoryInterface => ({
    list: vi.fn(),
    calculateAvailableBalance: vi.fn(),
  });
