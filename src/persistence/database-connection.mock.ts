import { vi } from 'vitest';
import { IDatabaseConnection } from './database-connection.interface';

export const createDatabaseConnectionMock = (): IDatabaseConnection => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getClient: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  }),
  close: vi.fn().mockResolvedValue(undefined),
});
