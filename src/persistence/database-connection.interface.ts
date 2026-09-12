// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryFn = <T = any>(
  queryText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values?: any[],
) => Promise<T[]>;

export interface IDatabaseConnection {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T = any>(queryText: string, values?: any[]): Promise<T[]>;

  /**
   * Runs `callback` inside a single BEGIN/COMMIT/ROLLBACK transaction on one
   * held connection. `query` inside the callback must be the one passed in,
   * not `IDatabaseConnection.query` — that runs on the pool, not this
   * transaction's connection, and would not see uncommitted writes or
   * participate in the lock.
   *
   * This is what IKM-5.1's row-locking requirement and IKM-5.4/IKM-4.2's
   * multi-statement atomic writes depend on.
   */
  transaction<T>(callback: (query: QueryFn) => Promise<T>): Promise<T>;

  close(): Promise<void>;
}

// Runtime token value for NestJS Dependency Injection
export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');
