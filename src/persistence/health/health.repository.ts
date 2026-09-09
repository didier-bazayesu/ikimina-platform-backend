import { HealthRepository } from 'src/application/health/health.repository.interface';
export class HealthRepositoryImpl implements HealthRepository {
  async check(): Promise<boolean> {
    return await Promise.resolve(true);
  }
}
