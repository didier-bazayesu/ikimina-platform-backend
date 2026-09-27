import { vi } from 'vitest';
import { PasswordHasherInterface } from './password-hasher.interface';

export const createPasswordHasherMock = (): PasswordHasherInterface => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  verify: vi.fn().mockResolvedValue(true),
});
