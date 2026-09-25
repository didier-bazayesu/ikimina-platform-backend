import type { SystemSettings } from './system-settings';

export interface UpdateSystemSettingsInput {
  monthlyShareAmount?: number;
  penaltyPercentage?: number;
  dueDay?: number;
  currency?: string;
  updatedBy: string;
}

export interface SystemSettingsRepositoryInterface {
  getCurrent(): Promise<SystemSettings>;
  update(params: UpdateSystemSettingsInput): Promise<SystemSettings>;
}

export const SYSTEM_SETTINGS_REPOSITORY = Symbol('SYSTEM_SETTINGS_REPOSITORY');
