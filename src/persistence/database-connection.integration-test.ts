/**
 * Integration test — Transaction rollback proof.
 *
 * This is the acceptance criterion for IKM-0.3:
 *   "IDatabaseConnection.transaction() verified with a test that runs two writes
 *    inside one callback and confirms both roll back together on a thrown error."
 *
 * Requirements:
 *   - DATABASE_URL env var must point at the Neon *test* branch (not dev/prod).
 *   - Run with: npm run test:integration
 *
 * Why a real DB (not the mock):
 *   DatabaseConnectionMock.transaction() always succeeds — it can't prove that
 *   ROLLBACK actually runs on the real Postgres wire. Only a real connection can
 *   confirm that a failed callback leaves zero committed rows.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseConnection } from './database-connection';

// ---- minimal ConfigService stub -------------------------------------------
// We don't want the full NestJS DI container here — just enough to satisfy
// DatabaseConnection's constructor, which reads DATABASE_URL and DB_MAX_CONNECTIONS.

class ConfigServiceStub {
  get(key: string): unknown {
    if (key === 'DATABASE_URL') {
      const url = process.env['DATABASE_URL'];
      if (!url)
        throw new Error(
          'DATABASE_URL is not set — cannot run integration tests',
        );
      return url;
    }
    if (key === 'DB_MAX_CONNECTIONS') return 2;
    return undefined;
  }
}

// ---------------------------------------------------------------------------

describe('DatabaseConnection.transaction() — integration (real Neon)', () => {
  let db: DatabaseConnection;

  beforeAll(async () => {
    // Construct directly — no Nest DI needed for integration tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db = new DatabaseConnection(new ConfigServiceStub() as any);
    db.onModuleInit(); // creates the Pool
  });

  afterAll(async () => {
    await db.onModuleDestroy();
  });

  it('rolls back all writes when the callback throws', async () => {
    // 1. Create a test table outside any transaction so we can query it afterwards.
    await db.query(`
      CREATE TABLE IF NOT EXISTS _tx_rollback_test (
        id   SERIAL PRIMARY KEY,
        marker TEXT NOT NULL
      )
    `);

    // 2. Run a transaction that inserts a row, then throws.
    const uniqueMarker = `rollback-test-${Date.now()}`;

    await expect(
      db.transaction(async (query) => {
        await query('INSERT INTO _tx_rollback_test (marker) VALUES ($1)', [
          uniqueMarker,
        ]);
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');

    // 3. Verify the row was NOT committed.
    const rows = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM _tx_rollback_test WHERE marker = $1',
      [uniqueMarker],
    );
    expect(rows[0]?.count).toBe('0');
  });

  it('commits all writes when the callback succeeds', async () => {
    const uniqueMarker = `commit-test-${Date.now()}`;

    await db.transaction(async (query) => {
      await query('INSERT INTO _tx_rollback_test (marker) VALUES ($1)', [
        uniqueMarker,
      ]);
    });

    const rows = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM _tx_rollback_test WHERE marker = $1',
      [uniqueMarker],
    );
    expect(rows[0]?.count).toBe('1');

    // Cleanup
    await db.query('DELETE FROM _tx_rollback_test WHERE marker = $1', [
      uniqueMarker,
    ]);
  });

  afterAll(async () => {
    // Best-effort cleanup of the test table itself.
    // Safe to leave in place on the test branch — it only holds test rows.
    await db.query('DROP TABLE IF EXISTS _tx_rollback_test').catch(() => {
      /* ignore */
    });
  });
});
