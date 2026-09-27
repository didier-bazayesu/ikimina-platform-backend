import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  SystemSettingsRepositoryInterface,
  UpdateSystemSettingsInput,
} from '../application/system-settings/system-settings.repository.interface';
import { SYSTEM_SETTINGS_REPOSITORY } from '../application/system-settings/system-settings.repository.interface';
import type { SystemSettings } from '../application/system-settings/system-settings';

interface SystemSettingsRow {
  id: number;
  monthly_share_amount: string;
  penalty_percentage: string;
  due_day: number;
  currency: string;
  updated_at: string;
  updated_by: string | null;
}

function toDomain(row: SystemSettingsRow): SystemSettings {
  return {
    id: row.id,
    monthlyShareAmount: parseFloat(row.monthly_share_amount),
    penaltyPercentage: parseFloat(row.penalty_percentage),
    dueDay: row.due_day,
    currency: row.currency,
    updatedAt: new Date(row.updated_at),
    updatedBy: row.updated_by,
  };
}

@Injectable()
export class SystemSettingsRepository implements SystemSettingsRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async getCurrent(): Promise<SystemSettings> {
    const rows = await this.db.query<SystemSettingsRow>(
      `SELECT * FROM system_settings WHERE id = 1`,
    );
    if (!rows[0]) {
      throw new Error('System settings singleton row is missing');
    }
    return toDomain(rows[0]);
  }

  async update(params: UpdateSystemSettingsInput): Promise<SystemSettings> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (params.monthlyShareAmount !== undefined) {
      values.push(params.monthlyShareAmount);
      sets.push(`monthly_share_amount = $${values.length}`);
    }
    if (params.penaltyPercentage !== undefined) {
      values.push(params.penaltyPercentage);
      sets.push(`penalty_percentage = $${values.length}`);
    }
    if (params.dueDay !== undefined) {
      values.push(params.dueDay);
      sets.push(`due_day = $${values.length}`);
    }
    if (params.currency !== undefined) {
      values.push(params.currency);
      sets.push(`currency = $${values.length}`);
    }

    // Always update updated_by and updated_at
    values.push(params.updatedBy);
    sets.push(`updated_by = $${values.length}`);
    sets.push(`updated_at = now()`);

    const query = `
      UPDATE system_settings
      SET ${sets.join(', ')}
      WHERE id = 1
      RETURNING *
    `;

    const rows = await this.db.query<SystemSettingsRow>(query, values);
    return toDomain(rows[0]);
  }
}

export { SYSTEM_SETTINGS_REPOSITORY };
