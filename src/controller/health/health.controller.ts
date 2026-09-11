import { Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { type HealthServiceInterface } from 'src/application/health/health.service.interface';
import { HEALTH_SERVICE } from 'src/application/health/health.tokens';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE)
    private readonly healthService: HealthServiceInterface,
  ) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Health status returned.' })
  @ApiResponse({ status: 500, description: 'Health check failed.' })
  async check() {
    const health = await this.healthService.check();
    return {
      status: health ? 'ok' : 'unhealthy',
    };
  }
}
