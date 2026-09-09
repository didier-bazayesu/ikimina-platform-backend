import { HealthRepository } from '../../application/health/health.repository.interface.js';

export class HealthRepositoryMock implements HealthRepository {
  async check(): Promise<boolean> {
    return await Promise.resolve(true);
  }
}
