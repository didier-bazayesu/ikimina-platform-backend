# Sprint 0 — Handoff to Codebase AI

This document is a complete, verified status of Sprint 0 as of this
handoff, built by going through every ticket file-by-file rather than
trusting status labels. Where something is marked "confirmed," it means
actual pasted code or terminal output was reviewed — not just claimed.
Where something is marked "stated but not re-verified," treat it as
probably true but worth a quick check before building on top of it.

**Read the "Lessons learned" section first** — it documents real bugs
already hit and fixed in this exact codebase. Following these from the
start avoids re-introducing them.

---

## Lessons learned (apply these project-wide, not just where found)

1. **`import type` breaks NestJS dependency injection.** Any class injected
   via a constructor parameter (e.g. `ConfigService`) must use a real value
   import (`import { ConfigService } from '@nestjs/config'`), never
   `import type { ConfigService } from ...`. Nest's DI resolves constructor
   parameters via runtime reflection metadata; a type-only import is erased
   at compile time and leaves nothing for Nest to resolve, causing
   `UnknownDependenciesException` with `dependencies: [[Function: Function]]`
   at boot — even though the code compiles with zero TypeScript errors.
   This already happened once with `DatabaseConnection`'s `ConfigService`
   parameter and was fixed. **Interfaces and DI tokens are fine as
   `import type`** — this rule only applies to concrete injectable classes
   used as constructor parameter types.

2. **Don't merge a TypeScript `interface` and a `const` DI token under the
   same identifier.** `database-connection.interface.ts` originally did
   `export interface IDatabaseConnection {...}` and
   `export const IDatabaseConnection = Symbol(...)` in the same file. This
   breaks under strict module settings (`verbatimModuleSyntax` or similar)
   because a single identifier can't cleanly be both a type-only and a
   value import target. **Convention going forward:** every feature keeps
   its DI token(s) in a separate `<feature>.tokens.ts` file (e.g.
   `health.tokens.ts` exports `HEALTH_SERVICE`, `HEALTH_REPOSITORY`), and
   the interface file exports only the type. `database-connection.ts` was
   already split this way — follow that pattern for every future feature
   (`contribution.tokens.ts`, `member.tokens.ts`, etc.), not the merged
   pattern.

3. **`persistence/` must stay flat — no per-feature subfolders.** This was
   violated twice for the `health` feature (`persistence/health/health.repository.ts`,
   then again for `persistence/health/health.repository.mock.ts`) before
   being caught both times. `controller/<feature>/` and
   `application/<feature>/` get subfolders; `persistence/` does not — one
   file per feature, flat, e.g. `persistence/contribution.repository.ts`.

4. **When you move a file, relative import depth changes on both ends.**
   Moving `health.repository.mock.ts` out of `persistence/health/` into
   flat `persistence/` broke two relative imports that weren't updated:
   the file's own import of `application/health/health.repository.interface.ts`
   (needed one fewer `../`) and every file importing the mock (also needed
   one fewer `../`). Check both directions whenever a file moves.

5. **Naming convention: `<Feature>RepositoryInterface` /
   `<Feature>Repository`, no `Impl` suffix.** The interface is
   `HealthRepositoryInterface`; the concrete class is `HealthRepository`
   (not `HealthRepositoryImpl`). Apply this to every future feature.

6. **`import/no-restricted-paths` (from `eslint-plugin-import`) is not
   used in this project — it requires a working TypeScript resolver
   (`eslint-import-resolver-typescript`), and a version mismatch between
   that resolver and `eslint-plugin-import` under ESLint 9 flat config
   produced `Resolve error: typescript with invalid interface loaded as
resolver` across nearly every file.** The dependency-rule guard is
   implemented instead with ESLint core's built-in `no-restricted-imports`,
   which matches import specifier text directly and needs no resolver
   package at all. See the finalized `eslint.config.js` under IKM-0.2 below.
   Do not reintroduce `eslint-plugin-import`/`eslint-import-resolver-typescript`
   for this purpose.

7. **A colocated `.test.ts` for a service must construct the service with
   the mock injected — it must not call methods on the mock directly.**
   `health.service.test.ts` originally did `new HealthRepositoryMock()`
   and called `.check()` on it directly, which tests the mock, not
   `HealthService`. The correct shape:
   ```typescript
   const repository = new HealthRepositoryMock();
   const service = new HealthService(repository);
   const result = await service.check();
   ```
   **This specific fix needs to be re-verified as actually applied** — see
   IKM-0.2 remaining items below.

---

## IKM-0.1 — README + repo scaffold

**Status: ✅ Done.** No open items.

---

## IKM-0.2 — Skeleton + lint/format/hooks

### Confirmed done

- App boots successfully; `health` feature's full DI chain confirmed wired
  end-to-end: `HealthController` → `HealthServiceInterface`
  (`@Inject(HEALTH_SERVICE)`) → `HealthService` → `HealthRepositoryInterface`
  (`@Inject(HEALTH_REPOSITORY)`) → `HealthRepository`, bound in
  `module/health.module.ts` and imported into the root module.
- Folder skeleton exists under `controller/`, `application/`, `persistence/`,
  `module/`.
- `persistence/health.repository.ts` and `persistence/health.repository.mock.ts`
  are both correctly flat (moved out of a nested `persistence/health/`
  subfolder — see Lesson 3).
- `HealthRepositoryInterface`/`HealthServiceInterface` correctly placed in
  `application/health/`.
- ESLint config rewritten to avoid the resolver crash (Lesson 6); current
  working `eslint.config.js`:
  ```javascript
  import tseslint from 'typescript-eslint';

  export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**'] },
    ...tseslint.configs.recommended,
    {
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-explicit-any': 'warn',
        // NOTE: do not enable 'consistent-type-imports' with
        // prefer: 'type-imports' without also carving out an exception
        // for constructor-injected classes — see Lesson 1. If re-adding
        // this rule, verify it does not silently convert a value import
        // of an injectable class into `import type`.
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    {
      files: ['src/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'pg',
                message:
                  'application/ must depend on a repository interface, not pg directly.',
              },
            ],
            patterns: [
              {
                group: ['**/persistence/**', '*/persistence/*'],
                message:
                  'application/ must depend on a repository interface, not persistence/ directly.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/controller/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/persistence/**', '*/persistence/*'],
                message: 'controller/ must never import persistence/ directly.',
              },
              {
                group: ['**/*.service'],
                message:
                  'controller/ must depend on the *.service.interface.ts, not the concrete service class.',
              },
            ],
          },
        ],
      },
    },
  );
  ```
  `eslint-plugin-import` and `eslint-import-resolver-typescript` can be
  uninstalled — nothing in this config uses them.

### Remaining — do these in order

1. **Rename the root module file and remove default Nest scaffolding.**
   The class was already renamed to `MainModule`, but the file itself is
   still `app.module.ts`, and it still wires in default-generated
   `AppController`/`AppService`.

   ```bash
   git rm src/app.controller.ts src/app.service.ts src/app.controller.spec.ts
   git mv src/app.module.ts src/main.module.ts
   ```

   Update `src/main.module.ts` to:

   ```typescript
   import { Module } from '@nestjs/common';
   import { HealthModule } from './module/health.module';
   import { DatabaseModule } from './module/database.module';
   import { AppConfigModule } from './module/app-config.module';

   @Module({
     imports: [HealthModule, DatabaseModule, AppConfigModule],
   })
   export class MainModule {}
   ```

   Update `src/main.ts` to import `from './main.module'` instead of
   `from './app.module'`.
   **Check `test/app.e2e-spec.ts` before deleting the app files** — if it
   references `AppController`/`AppService`, it will fail to compile once
   they're gone. Either delete it or rewrite it against `HealthController`.

2. **Verify `health.service.test.ts` actually tests the service, not the
   mock** (Lesson 7). Open the file and confirm it matches:

   ```typescript
   import { describe, it, expect } from 'vitest';
   import { HealthService } from './health.service.js';
   import { HealthRepositoryMock } from '../../persistence/health.repository.mock.js';

   describe('HealthService', () => {
     it('should return true when the repository reports healthy', async () => {
       const repository = new HealthRepositoryMock();
       const service = new HealthService(repository);

       const result = await service.check();

       expect(result).toBe(true);
     });
   });
   ```

   If it still constructs `HealthRepositoryMock` and calls `.check()` on it
   directly without ever constructing `HealthService`, fix it to the shape
   above.

3. **Fix `error-response.util.ts:24`** — a genuine lint error was found
   here (`@typescript-eslint/no-unused-expressions`: "Expected an
   assignment or function call and instead saw an expression"). This
   indicates a real bug — likely an accidental standalone expression like
   `a?.b` or a ternary written as a statement instead of inside an `if` or
   assignment. Open the file, find line 24, and fix the actual logic (not
   just silence the lint rule).

4. **Reconcile the two different `lint` scripts seen in this project.**
   `package.json` was pasted showing `"lint": "eslint . --max-warnings=0"`,
   but the script that actually ran via Husky was Nest's default
   `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"`. Decide which
   is correct and make `package.json` match it. If keeping `--fix` inside
   the pre-commit hook, be aware it rewrites files _after_ they're staged —
   either add `lint-staged` so fixed files get re-staged automatically, or
   remove `--fix` from the hook and require developers to run `lint --fix`
   manually before committing.

5. **Fix `package.json`'s `name` field** — currently `"next js@0.0.1"`,
   almost certainly an unedited scaffold default. Change to
   `"ikimina-platform-backend"` or the project's actual intended name.

6. **Prove the dependency-rule lint guard actually catches a violation.**
   Temporarily add `import { Pool } from 'pg';` to the top of
   `application/health/health.service.ts`, run `npm run lint`, confirm it
   fails with the custom message from the config above, then remove the
   line. This is the real acceptance test for the rule — do not consider
   it done just because the config file exists and the project lints clean
   in its absence.

7. **Re-run `npm run lint` clean, end to end, after all of the above.**
   Confirm zero errors (warnings from `no-explicit-any` on
   `database-connection.interface.ts`/`.ts` are acceptable/expected for
   now — those are pre-existing, low-priority `any` usages in generic
   query typing, not a blocker).

8. **Confirm Husky pre-commit passes on a real commit** after all fixes
   above — `git commit` should complete without the hook failing.

9. **Minor:** git warned about LF→CRLF conversion on several files during
   the last commit. Not blocking, but consider adding a `.gitattributes`
   with `* text=auto eol=lf` if consistent line endings matter to the team
   (mixed-OS contributors on Windows are likely given the paths shown).

---

## IKM-0.3 — Neon + `pg.Pool` + node-pg-migrate

### Confirmed done

- `database-connection.config.ts` deleted (stated by dev; recommend one
  final `ls src/persistence/` to visually confirm before closing this
  ticket, since earlier "yes" answers in this same ticket turned out to
  still show the file present).
- `database-connection.ts`, `.interface.ts`, `.mock.ts` implement a real
  transaction: `transaction()` checks out a single `PoolClient` via
  `pool.connect()`, runs `BEGIN`/`COMMIT`/`ROLLBACK` on that same client,
  releases it in `finally`, and the `QueryFn` passed into the callback is
  bound to the transactional client — not the pool — so code inside a
  transaction cannot accidentally escape it.
- `IDatabaseConnection` interface and `DATABASE_CONNECTION` token split
  into separate identifiers (Lesson 2), resolving the earlier
  type/value ambiguity compile errors.
- `module/database.module.ts` correctly provides/exports
  `DATABASE_CONNECTION` bound to `DatabaseConnection`, marked `@Global()`.
- `node-pg-migrate` installed; a first placeholder migration
  (`1000000000000000_initial_migration`) was run in both directions
  against the real Neon database, with actual terminal output confirming
  `CREATE TABLE _placeholder` / row insert into `pgmigrations` on `up`, and
  `DROP TABLE` / row delete on `down`. This is the strongest evidence
  gathered in this whole handoff — a real database round-trip, not just a
  syntax check.
- App boots successfully with `DatabaseConnection` fully wired (after the
  `ConfigService` `import type` fix from Lesson 1).

### Remaining — do these in order

1. **Fix the inconsistent `await` in the placeholder migration.** `up()`
   currently calls `pgm.sql(...)` without `await`; `down()` awaits the
   same call. Make both consistent:

   ```typescript
   export async function up(pgm: MigrationBuilder): Promise<void> {
     await pgm.sql('CREATE TABLE _placeholder (id INT PRIMARY KEY);');
   }

   export async function down(pgm: MigrationBuilder): Promise<void> {
     await pgm.sql('DROP TABLE _placeholder;');
   }
   ```

   Low risk as a single-statement migration, but this becomes a real bug
   risk the first time a multi-statement migration is written without
   `await` on every statement.

2. **Paste and review `pgmigrate.config.json`.** This has never actually
   been shown. Confirm it points at the Neon **test** branch specifically
   (not the same branch as dev/prod — running migrations against the wrong
   branch during CI or local dev could corrupt real data). If it's
   currently hardcoded to one connection string, parameterize it via the
   env config module (IKM-0.4) instead.

3. **Write the transaction-rollback proof test.** This is the actual
   acceptance criterion for the Neon/`pg.Pool` fix — not that it compiles,
   but that it behaves correctly under a real failure:

   ```typescript
   // persistence/database-connection.integration-test.ts (or similar)
   it('rolls back all writes when the callback throws', async () => {
     await expect(
       db.transaction(async (query) => {
         await query('CREATE TEMP TABLE tx_test (id INT)');
         await query('INSERT INTO tx_test (id) VALUES (1)');
         throw new Error('forced failure');
       }),
     ).rejects.toThrow('forced failure');

     // Verify the table doesn't exist / insert didn't persist,
     // using a fresh query() call outside the failed transaction.
     // Exact assertion depends on whether using a real temp table
     // (scoped to connection, so this needs adjusting) or a real
     // committed table created in a prior migration — recommend
     // using the _placeholder table or a dedicated test table,
     // inserting a row inside the failing transaction, and asserting
     // via a separate query() call that the row does not exist.
   });
   ```

   Run this against the real Neon test branch, not the mock — the mock's
   `transaction()` always succeeds, so it cannot prove real rollback
   behavior.

4. **Reconcile the two different SSL configuration approaches.**
   `DatabaseConnection` sets `ssl: { rejectUnauthorized: false }` as a
   `Pool` option; `node-pg-migrate`'s connection (via
   `pgmigrate.config.json`) appears to go through a connection-string
   `sslmode=` parameter instead (inferred from the
   `pg-connection-string` SSL deprecation warning seen in migration output).
   Both work today, but they're two different mechanisms for the same
   requirement. Document which approach is deliberate for which tool, or
   standardize on one if `node-pg-migrate`'s config supports a `ssl` object
   option directly.

---

## IKM-0.4 — Env config module

### Confirmed done

- `AppConfigModule`, `env.schema.ts` (Zod schema covering `DATABASE_URL`,
  `NODE_ENV`, `PORT`, `DB_MAX_CONNECTIONS`) exist and are wired into the
  root module.
- `ConfigService` is correctly used (as a value import) by
  `DatabaseConnection`.

### Remaining

1. **Confirm `.env.example` is actually committed**, listing every
   variable the Zod schema requires, with placeholder (non-real) values.

---

## IKM-0.5 — Storage & mail adapters

**Status: ⬜ Not started.** Confirmed not blocking Sprint 1 — safe to defer.

---

## IKM-0.6 — Global exception filters + response envelope

### Stated done, not re-verified in this handoff

- Five filters exist: `not-found`, `access-denied`, `validation`, `http`,
  `unhandled` — registered in `setup-app.ts` in specific-to-general order.
- `application/not-found.error.ts`, `application/access-denied.error.ts`
  exist.

### Remaining

1. **Build the `ResponseInterceptor` for the success envelope.** Currently
   only the _error_ envelope (`{ success: false, message, error }`) is
   built by the filters. Every ticket from Sprint 1 onward documents
   successful responses as `{ success: true, data, message }`, but nothing
   currently wraps a controller's return value into that shape — e.g.
   `HealthController.check()` currently returns a raw
   `{ status: 'ok' }` object, unwrapped. Add a global interceptor:

   ```typescript
   // controller/response.interceptor.ts
   import {
     Injectable,
     NestInterceptor,
     ExecutionContext,
     CallHandler,
   } from '@nestjs/common';
   import { Observable } from 'rxjs';
   import { map } from 'rxjs/operators';

   @Injectable()
   export class ResponseInterceptor implements NestInterceptor {
     intercept(
       context: ExecutionContext,
       next: CallHandler,
     ): Observable<unknown> {
       return next.handle().pipe(
         map((data) => ({
           success: true,
           data: data ?? null,
           message: 'Success', // consider allowing per-route override
         })),
       );
     }
   }
   ```

   Register it in `setup-app.ts` via `app.useGlobalInterceptors(new ResponseInterceptor())`.
   **After adding it, verify `GET /health` actually returns
   `{ success: true, data: { status: 'ok' }, message: '...' }`** — don't
   assume the interceptor fires correctly without checking a real response.

2. **Fix the typo in `HealthController`**: `'un health'` should be
   `'unhealthy'`.

3. **Check for a stray duplicate exception filter.** Earlier investigation
   flagged a possible `not-found.exception.filter.ts` (dot-typo, wrong
   naming convention) sitting alongside the correctly-named
   `not-found.exception-filter.ts`. Run:
   ```bash
   find src/controller -iname "*not-found*"
   ```
   and delete the incorrectly-named duplicate if it exists.

---

## IKM-0.7 — Swagger setup

### Stated done, not re-verified

- `configureOpenAPI()` written in `setup-app.ts`, `@nestjs/swagger@^11`
  resolves.

### Remaining

1. **Confirm `/api/docs` actually loads** when running the app — open it
   in a browser or `curl` it and check for a 200 with real Swagger UI HTML.
2. **Document the `health` endpoint** with `@ApiTags('health')` and
   `@ApiResponse` decorators on `HealthController.check()`, covering at
   least 200 and 500, to establish the pattern every future controller
   ticket copies.

---

## IKM-0.8 — CI skeleton

**Status: ⬜ Not started.** Do this last, after everything above is
confirmed working — this ticket's whole purpose is running lint + tests
automatically, so it depends on lint (IKM-0.2) and whatever test suite
exists being in a genuinely passing state first. Add a GitHub Actions
workflow (or equivalent) running `npm run lint` and `npm test` on every
PR, with branch protection blocking merge on failure.

---

## Suggested order to finish Sprint 0 from here

1. IKM-0.2 items 1–9 (mostly quick, mechanical fixes and one real bug fix
   in `error-response.util.ts`)
2. IKM-0.3 items 1–4 (the transaction rollback test is the most valuable
   remaining piece of evidence in the whole sprint — it's the one thing
   that actually proves the Neon/`pg.Pool` rewrite achieves what it set
   out to)
3. IKM-0.4 item 1 (`.env.example` — quick)
4. IKM-0.6 items 1–3 (`ResponseInterceptor` — every Sprint 1+ ticket's
   documented response shape depends on this existing)
5. IKM-0.7 items 1–2 (quick verification + one documented endpoint)
6. IKM-0.5 (storage/mail — can run in parallel with anything above, or
   defer to just before Sprint 5 needs it)
7. IKM-0.8 (CI — last, once there's something real to lint and test)
