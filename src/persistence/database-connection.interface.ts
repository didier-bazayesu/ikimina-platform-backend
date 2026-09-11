/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional: raw SQL queries accept arbitrary parameter types and return
// generic row shapes — using `any` here is a deliberate, documented trade-off
// for the pg driver boundary. Repository implementations are responsible for
// typing their own results correctly.
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
