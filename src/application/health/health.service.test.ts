import { describe, it, expect } from 'vitest';
import { HealthRepositoryMock } from '../../persistence/health/health.repository.mock.js';

describe('HealthService', () => {
  it('should return true when the repository reports healthy', async () => {
    const repository = new HealthRepositoryMock();

    const result = await repository.check();

    expect(result).toBe(true);
  });
});
