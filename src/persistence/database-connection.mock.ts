import { vi } from 'vitest';
import type { IDatabaseConnection, QueryFn } from './database-connection.interface';

export const createDatabaseConnectionMock = (): IDatabaseConnection => ({
  query: vi.fn().mockResolvedValue([]),
  transaction: vi
    .fn()
    .mockImplementation(
      async (callback: (query: QueryFn) => Promise<unknown>) => {
        const query: QueryFn = vi.fn().mockResolvedValue([]);
        return callback(query);
      },
    ),
  close: vi.fn().mockResolvedValue(undefined),
});
