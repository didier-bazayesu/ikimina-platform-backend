import { describe, it, expect, beforeEach } from 'vitest';
import { SystemSettingsService } from './system-settings.service';
import {
  mockSystemSettingsRepository,
  createMockSystemSettings,
} from './system-settings.repository.mock';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let repository: ReturnType<typeof mockSystemSettingsRepository>;

  beforeEach(() => {
    repository = mockSystemSettingsRepository();
    service = new SystemSettingsService(repository);
  });

  describe('getSettings', () => {
    it('returns the current settings from the repository', async () => {
      const mockSettings = createMockSystemSettings();
      repository.getCurrent.mockResolvedValue(mockSettings);

      const result = await service.getSettings();

      expect(result).toBe(mockSettings);
      expect(repository.getCurrent).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('passes the admin user ID and params to the repository', async () => {
      const mockSettings = createMockSystemSettings({
        monthlyShareAmount: 30000,
      });
      repository.update.mockResolvedValue(mockSettings);

      const result = await service.updateSettings('admin-123', {
        monthlyShareAmount: 30000,
        dueDay: 15,
      });

      expect(result).toBe(mockSettings);
      expect(repository.update).toHaveBeenCalledWith({
        monthlyShareAmount: 30000,
        dueDay: 15,
        updatedBy: 'admin-123',
      });
    });
  });
});
