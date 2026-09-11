import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service';
import { HealthRepositoryMock } from '../../persistence/health.repository.mock';

describe('HealthService', () => {
  it('should return true when the repository reports healthy', async () => {
    const repository = new HealthRepositoryMock();
    const service = new HealthService(repository);

    const result = await service.check();

    expect(result).toBe(true);
  });
});
