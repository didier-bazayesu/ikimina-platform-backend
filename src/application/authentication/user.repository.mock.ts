import { vi } from 'vitest';
import { UserRepositoryInterface } from './user.repository.interface';

export const createUserRepositoryMock = (): UserRepositoryInterface => ({
  create: vi.fn(),
  findByEmail: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(null),
  updatePasswordHash: vi.fn(),
});
