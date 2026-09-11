import { Module } from '@nestjs/common';
import { HealthService } from 'src/application/health/health.service';
import {
  HEALTH_REPOSITORY,
  HEALTH_SERVICE,
} from 'src/application/health/health.tokens';
import { HealthController } from 'src/controller/health/health.controller';
import { HealthRepository } from 'src/persistence/health.repository';

@Module({
  providers: [
    {
      provide: HEALTH_SERVICE,
      useClass: HealthService,
    },
    {
      provide: HEALTH_REPOSITORY,
      useClass: HealthRepository,
    },
  ],
  controllers: [HealthController],
})
export class HealthModule {}
