import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './module/health.module';

@Module({
  imports: [HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
