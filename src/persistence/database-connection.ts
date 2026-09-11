import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient } from 'pg';
import {
  IDatabaseConnection,
  type QueryFn,
} from './database-connection.interface';
import { EnvConfig } from '../config/env.schema';

@Injectable()
export class DatabaseConnection
  implements IDatabaseConnection, OnModuleInit, OnModuleDestroy
{
  private pool!: Pool;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  onModuleInit(): void {
    this.pool = new Pool({
      connectionString: this.configService.get('DATABASE_URL', { infer: true }),
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
      max: this.configService.get('DB_MAX_CONNECTIONS', { infer: true }) ?? 10,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg driver boundary; result rows are only meaningfully typed by the caller via <T>
  async query<T = any>(queryText: string, values: any[] = []): Promise<T[]> {
    const result = await this.pool.query(queryText, values);
    return result.rows;
  }

  async transaction<T>(callback: (query: QueryFn) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const boundQuery: QueryFn = async (queryText, values = []) => {
        const result = await client.query(queryText, values);
        return result.rows;
      };

      const outcome = await callback(boundQuery);

      await client.query('COMMIT');
      return outcome;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }
    await this.pool.end();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
