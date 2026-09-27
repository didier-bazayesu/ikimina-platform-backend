import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication.module';
import { SYSTEM_SETTINGS_REPOSITORY } from '../application/system-settings/system-settings.repository.interface';
import { SystemSettingsRepository } from '../persistence/system-settings.repository';
import { SYSTEM_SETTINGS_SERVICE } from '../application/system-settings/system-settings.service.interface';
import { SystemSettingsService } from '../application/system-settings/system-settings.service';
import { SystemSettingsController } from '../controller/system-settings/system-settings.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [SystemSettingsController],
  providers: [
    { provide: SYSTEM_SETTINGS_REPOSITORY, useClass: SystemSettingsRepository },
    { provide: SYSTEM_SETTINGS_SERVICE, useClass: SystemSettingsService },
  ],
  exports: [SYSTEM_SETTINGS_SERVICE, SYSTEM_SETTINGS_REPOSITORY],
})
export class SystemSettingsModule {}
