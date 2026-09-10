import { Controller, Get, Inject } from '@nestjs/common';
import { type HealthServiceInterface } from 'src/application/health/health.service.interface';
import { HEALTH_SERVICE } from 'src/application/health/health.tokens';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE)
    private readonly healthService: HealthServiceInterface,
  ) {}

  @Get()
  async check() {
    const health = await this.healthService.check();
    return {
      status: health ? 'ok' : 'un health',
    };
  }
}
