export type QueryFn = <T = any>(
  queryText: string,
  values?: any[],
) => Promise<T[]>;
export interface IDatabaseConnection {
  query<T = any>(queryText: string, values?: any[]): Promise<T[]>;
  transaction<T>(callback: (query: QueryFn) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// Runtime token value for NestJS Dependency Injection
export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');
