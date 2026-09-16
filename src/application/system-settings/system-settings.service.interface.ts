import type { SystemSettings } from './system-settings';

export interface UpdateSystemSettingsParams {
  monthlyShareAmount?: number;
  penaltyPercentage?: number;
  dueDay?: number;
  currency?: string;
}

export interface SystemSettingsServiceInterface {
  getSettings(): Promise<SystemSettings>;
  updateSettings(
    adminUserId: string,
    params: UpdateSystemSettingsParams,
  ): Promise<SystemSettings>;
}

export const SYSTEM_SETTINGS_SERVICE = Symbol('SYSTEM_SETTINGS_SERVICE');
