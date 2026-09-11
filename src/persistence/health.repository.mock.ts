import type { HealthRepositoryInterface } from "src/application/health/health.repository.interface";

export class HealthRepositoryMock implements HealthRepositoryInterface {
  async check(): Promise<boolean> {
    return await Promise.resolve(true);
  }
}
