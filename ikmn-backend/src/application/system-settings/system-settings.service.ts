import { Inject, Injectable } from '@nestjs/common';
import type {
  SystemSettingsServiceInterface,
  UpdateSystemSettingsParams,
} from './system-settings.service.interface';
import type { SystemSettingsRepositoryInterface } from './system-settings.repository.interface';
import { SYSTEM_SETTINGS_REPOSITORY } from './system-settings.repository.interface';
import type { SystemSettings } from './system-settings';

@Injectable()
export class SystemSettingsService implements SystemSettingsServiceInterface {
  constructor(
    @Inject(SYSTEM_SETTINGS_REPOSITORY)
    private readonly repository: SystemSettingsRepositoryInterface,
  ) {}

  async getSettings(): Promise<SystemSettings> {
    return this.repository.getCurrent();
  }

  async updateSettings(
    adminUserId: string,
    params: UpdateSystemSettingsParams,
  ): Promise<SystemSettings> {
    return this.repository.update({
      ...params,
      updatedBy: adminUserId,
    });
  }
}
