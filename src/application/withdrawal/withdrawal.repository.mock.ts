import { vi } from 'vitest';
import type { Mocked } from 'vitest';
import type { WithdrawalRepositoryInterface } from './withdrawal.repository.interface';

export const WithdrawalRepositoryMock =
  (): Mocked<WithdrawalRepositoryInterface> => ({
    create: vi.fn(),
    list: vi.fn(),
  });
