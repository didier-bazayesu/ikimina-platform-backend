import { vi } from 'vitest';
import type { Mocked } from 'vitest';
import type { TimeProviderInterface } from './time-provider.interface';

export const mockTimeProvider = (): Mocked<TimeProviderInterface> => ({
  now: vi.fn(),
  isOverdue: vi.fn(),
});
