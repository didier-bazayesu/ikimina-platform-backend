import { QueryResult, QueryResultRow, PoolClient } from 'pg';

export interface IDatabaseConnection {
  query<T extends QueryResultRow = any>(
    queryText: string,
    values?: any[],
  ): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  close(): Promise<void>;
}

// Runtime token value required by NestJS DI Container
export const IDatabaseConnection = Symbol('IDatabaseConnection');
