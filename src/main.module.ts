import { Module } from '@nestjs/common';
import { HealthModule } from './module/health.module';
import { DatabaseModule } from './module/database.module';
import { AppConfigModule } from './module/app-config.module';

@Module({
  imports: [HealthModule, DatabaseModule, AppConfigModule],
})
export class MainModule {}
