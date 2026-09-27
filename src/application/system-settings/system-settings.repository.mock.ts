import { vi } from 'vitest';
import type { Mocked } from 'vitest';
import type { SystemSettingsRepositoryInterface } from './system-settings.repository.interface';
import type { SystemSettings } from './system-settings';

export const mockSystemSettingsRepository =
  (): Mocked<SystemSettingsRepositoryInterface> => ({
    getCurrent: vi.fn(),
    update: vi.fn(),
  });

export const createMockSystemSettings = (
  overrides?: Partial<SystemSettings>,
): SystemSettings => ({
  id: 1,
  monthlyShareAmount: 20000,
  penaltyPercentage: 10,
  dueDay: 7,
  currency: 'RWF',
  updatedAt: new Date(),
  updatedBy: null,
  ...overrides,
});
