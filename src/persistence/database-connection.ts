import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { IDatabaseConnection } from './database-connection.interface';
import { getDatabaseConfig } from './database-connection.config';

@Injectable()
export class DatabaseConnection
  implements IDatabaseConnection, OnModuleInit, OnModuleDestroy
{
  private pool!: Pool;

  onModuleInit() {
    const config = getDatabaseConfig();
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: config.maxConnections,
    });
  }

  query<T extends QueryResultRow = any>(
    queryText: string,
    values?: any[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(queryText, values);
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async onModuleDestroy() {
    await this.close();
  }
}
