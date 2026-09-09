import { Controller, Get, Inject } from '@nestjs/common';
import { type HealthService } from 'src/application/health/health.service.interface';
import { HEALTH_SERVICE } from 'src/application/health/health.tokens';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE) private readonly healthService: HealthService,
  ) {}

  @Get()
  async check() {
    const health = await this.healthService.check();
    return {
      status: health ? 'ok' : 'un health',
    };
  }
}
