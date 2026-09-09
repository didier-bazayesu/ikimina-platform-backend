import { Inject } from '@nestjs/common';
import { type HealthRepository } from './health.repository.interface.js';
import { HealthService } from './health.service.interface.js';
import { HEALTH_REPOSITORY } from './health.tokens.js';

export class HealthServiceImpl implements HealthService {
  constructor(
    @Inject(HEALTH_REPOSITORY)
    private readonly healthRepository: HealthRepository,
  ) {}

  async check(): Promise<boolean> {
    return this.healthRepository.check();
  }
}
