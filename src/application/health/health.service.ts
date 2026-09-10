import { Inject } from '@nestjs/common';
import { type HealthRepositoryInterface } from './health.repository.interface.js';
import type { HealthServiceInterface } from './health.service.interface.js';
import { HEALTH_REPOSITORY } from './health.tokens.js';

export class HealthService implements HealthServiceInterface {
  constructor(
    @Inject(HEALTH_REPOSITORY)
    private readonly healthRepository: HealthRepositoryInterface,
  ) {}

  async check(): Promise<boolean> {
    return this.healthRepository.check();
  }
}
