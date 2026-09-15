import { Module } from '@nestjs/common';
import { HealthModule } from './module/health.module';
import { DatabaseModule } from './module/database.module';
import { AppConfigModule } from './module/app-config.module';
import { AuthenticationModule } from './module/authentication.module';
import { MemberModule } from './module/member.module';

@Module({
  imports: [
    HealthModule,
    DatabaseModule,
    AppConfigModule,
    AuthenticationModule,
    MemberModule,
  ],
})
export class MainModule {}
