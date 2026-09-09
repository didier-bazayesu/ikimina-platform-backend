import { Module } from '@nestjs/common';
import {
  HEALTH_REPOSITORY,
  HEALTH_SERVICE,
} from 'src/application/health/health.tokens';
import { HealthServiceImpl } from 'src/application/health/health.service';
import { HealthRepositoryImpl } from 'src/persistence/health/health.repository';
import { HealthController } from 'src/controller/health/health.controller';

@Module({
  providers: [
    {
      provide: HEALTH_SERVICE,
      useClass: HealthServiceImpl,
    },
    {
      provide: HEALTH_REPOSITORY,
      useClass: HealthRepositoryImpl,
    },
  ],
  controllers: [HealthController],
})
export class HealthModule {}
