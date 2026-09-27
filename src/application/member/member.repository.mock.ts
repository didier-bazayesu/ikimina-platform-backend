import { vi } from 'vitest';
import type { MemberRepositoryInterface } from './member.repository.interface';

export const createMemberRepositoryMock = (): MemberRepositoryInterface => ({
  create: vi.fn(),
  findById: vi.fn().mockResolvedValue(null),
  findByUserId: vi.fn().mockResolvedValue(null),
  findByMemberNumber: vi.fn().mockResolvedValue(null),
  list: vi.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
  update: vi.fn().mockResolvedValue(null),
});
