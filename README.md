# Gents Ikimina Investment Management System — Backend

## 1. Overview

Gents Ikimina Investment Management System digitizes the management of an
Ikimina (a member-based savings/investment group): monthly contributions,
penalties, withdrawals, transaction approvals, reports, and member
statements.

The platform **does not process payments**. Members pay through external
channels (mobile money, bank transfer, cash) and submit evidence of payment
through the platform. An Admin reviews and approves or rejects that evidence.
Only approved transactions affect the financial ledger.

## 2. Roles

There are exactly two roles. There is no Super Admin.

| Role       | Can do                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MEMBER** | View own dashboard, submit contribution/penalty payments with proof, view own transaction history, view own penalties and missing months, download own statement, update own profile |
| **ADMIN**  | Manage members, approve/reject contributions and penalty payments, waive penalties, record withdrawals, generate reports, configure system settings, view audit logs                 |

A member can never approve a transaction, edit another member, or view
another member's records. Withdrawals use a **single-admin + audit log**
model: the creating Admin's withdrawal is recorded immediately with a full
audit trail rather than requiring a second approver.

## 3. Core financial flow

Every active member has a **monthly obligation** (a fixed amount, due by a
fixed day each month). The obligation — not the raw payment — is the anchor
for everything else in the system (missing months, penalties, dashboards,
reports, statements).

```
Monthly obligation created (e.g. 20,000 RWF due the 7th)
        │
        ▼
Member pays externally (MoMo / Bank / Cash)
        │
        ▼
Member submits payment evidence
  (amount, date, months covered, method, reference, proof file)
        │
        ▼
ContributionPayment = PENDING
        │
        ▼
Admin reviews evidence
        │
   ┌────┴────┐
   ▼         ▼
APPROVED   REJECTED (reason required)
   │
   ▼
Obligation(s) marked PAID → ledger updated → dashboards/reports/statements reflect it
```

In parallel, a daily scheduler enforces the due date:

```
Daily scheduler (Africa/Kigali time)
        │
        ▼
For each active member, each unpaid obligation past the due day
        │
        ▼
Penalty already generated for this obligation?
        │
   ┌────┴────┐
  YES        NO
   │          │
   │          ▼
   │     Generate penalty (idempotent — running the job twice never
   │     creates a duplicate penalty for the same obligation)
   │          │
   └────┬─────┘
        ▼
 Member notified
```

Penalty payments follow the same submit → PENDING → Admin approve/reject
flow as contributions. An Admin may also **waive** a penalty directly.

### Money handling rules

- **Full months only.** A payment allocation for a given month must equal
  the monthly share amount in effect when that obligation was created.
  Partial-month payments are not supported.
- **Multi-month payments are split.** A single payment (e.g. 60,000 RWF)
  is stored as one `ContributionPayment` with multiple
  `ContributionAllocation` rows (one per covered month), never as one
  opaque lump sum.
- **Historical values are immutable.** Changing a system setting (e.g. the
  monthly share amount) today never retroactively changes a past month's
  obligation. Each obligation snapshots the values that applied when it
  was created.
- **Available balance** is always calculated from approved records, never
  stored as a running total on the member:
  `Approved Contributions + Approved Penalty Payments − Approved Withdrawals`

## 4. Tech stack

| Layer               | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime / Framework | Node.js, NestJS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Database            | PostgreSQL, hosted on Neon — used for every environment (dev, test, CI, prod); no local Docker Postgres                                                                                                                                                                                                                                                                                                                                                                                               |
| Database access     | `pg.Pool` (standard `pg` package) over a normal Postgres connection to Neon's `DATABASE_URL`, with hand-written SQL in repositories. Deliberately **not** `@neondatabase/serverless`'s HTTP driver — that driver has no persistent session, so it can't support the multi-statement transactions and row-level locking this project's financial writes require (see README §5, `IDatabaseConnection.transaction()`). `node-pg-migrate` for hand-written, auditable up/down schema migrations (no ORM) |
| Auth                | JWT (access + refresh), role-based guards                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| File storage        | Cloud object storage (S3 / Cloudinary) via a `storage` adapter in `persistence/`, same pattern as the database connection                                                                                                                                                                                                                                                                                                                                                                             |
| Email               | SMTP via a `mail` adapter in `persistence/`, provider swappable later                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Scheduling          | NestJS `@nestjs/schedule` (cron)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| API docs            | Swagger / OpenAPI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Testing             | Jest (unit + integration)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Timezone            | `Africa/Kigali` for all due-date and scheduler logic                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## 5. Architecture — layer-first hexagonal (ports & adapters)

The codebase is organized **by technical layer first, by feature second**,
following the same pattern as the team's reference project
(`c9-rptumba-storm-car-sharing-backend`). Every feature (e.g.
`contribution`) has a folder inside `controller/` and `application/`.
`persistence/` stays **flat** — one repository file per feature, no
per-feature subfolders, matching the reference project exactly.

**The dependency rule (non-negotiable):**

- `controller/<feature>` depends only on `application/<feature>`'s
  **service interface** — never the concrete service class directly.
- `application/<feature>`'s service depends only on its own
  **repository interface** — never on `persistence/`, the `pg` client, or
  raw SQL.
- `persistence/<feature>.repository.ts` implements that repository
  interface and is the only place SQL is written for that feature.
- Only the wiring file in `module/<feature>.module.ts` knows the concrete
  classes on both sides and binds interface → implementation via NestJS DI.

```
controller/contribution/contribution.controller.ts
        │  depends on (interface)
        ▼
application/contribution/contribution.service.interface.ts   ◄── implements ── contribution.service.ts
                                                                                       │
                                                                                       │  depends on (interface)
                                                                                       ▼
                                                              application/contribution/contribution.repository.interface.ts
                                                                                       ▲
                                                                                       │  implements
                                                                            persistence/contribution.repository.ts (raw SQL)
```

Both sides of every boundary are interfaces — this is what makes every
layer independently unit-testable with a colocated `.mock.ts` test double,
with no real database or HTTP server needed for `application/` tests.

**Transactional writes:** `IDatabaseConnection` (in `persistence/`)
exposes `transaction<T>(callback)` alongside `query()` — any repository
method that must write multiple rows atomically (e.g. IKM-5.1's payment +
allocations, IKM-5.4's approval + obligation mark-paid) runs through
`transaction()`, never through sequential unguarded `query()` calls. This
requires a real persistent-connection Postgres driver (`pg.Pool`), which is
why database access uses that rather than a stateless HTTP driver — see §4.

## 6. Naming conventions

**Database (PostgreSQL, raw SQL via `pg`)**

- Table names: snake_case, plural — `members`, `contribution_payments`
- Columns: snake_case — `member_id`, `payment_date`, `approved_by`
- Migrations: `node-pg-migrate`, one hand-written SQL up/down file per
  change, timestamp-prefixed, living in `/migrations` at the repo root
- Status/type columns: stored as Postgres `enum` types or constrained
  strings — mirrored by a TypeScript union or const object in
  `application/<feature>/<feature>-status.ts`

**Hexagonal layers — file naming**

| File                                     | Convention                                                                             | Example                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Domain entity                            | `<feature>.ts`                                                                         | `application/member/member.ts`                                         |
| Value object / status enum               | `<feature>-<aspect>.ts`                                                                | `application/contribution/contribution-status.ts`                      |
| Outbound port (repository interface)     | `<feature>.repository.interface.ts`                                                    | `application/member/member.repository.interface.ts`                    |
| Outbound port test double                | `<feature>.repository.mock.ts`                                                         | `application/member/member.repository.mock.ts`                         |
| Inbound port (service interface)         | `<feature>.service.interface.ts`                                                       | `application/member/member.service.interface.ts`                       |
| Use case (service implementation)        | `<feature>.service.ts`                                                                 | `application/member/member.service.ts`                                 |
| Service test double                      | `<feature>.service.mock.ts`                                                            | `application/member/member.service.mock.ts`                            |
| Unit test (colocated)                    | `<feature>.service.test.ts`                                                            | `application/member/member.service.test.ts`                            |
| Integration test (colocated)             | `<feature>.repository.integration-test.ts`, `<feature>.controller.integration-test.ts` | `persistence/member.repository.integration-test.ts`                    |
| Domain error — feature-specific          | `<feature>-<condition>.error.ts` (in the feature folder)                               | `application/member/member-not-found.error.ts`                         |
| Domain error — generic/shared            | `<condition>.error.ts` (at `application/` root)                                        | `application/not-found.error.ts`, `application/access-denied.error.ts` |
| Persistence adapter (flat, no subfolder) | `<feature>.repository.ts`                                                              | `persistence/contribution.repository.ts`                               |
| Controller                               | `<feature>.controller.ts`                                                              | `controller/contribution/contribution.controller.ts`                   |
| DTO(s) for a feature                     | `<feature>.dto.ts`                                                                     | `controller/contribution/contribution.dto.ts`                          |
| Cross-cutting exception filter           | `<condition>.exception-filter.ts` (at `controller/` root)                              | `controller/not-found.exception-filter.ts`                             |
| Guard / decorator (cross-cutting)        | `<name>.guard.ts`, `<name>.decorator.ts` (at `controller/` root)                       | `controller/roles.guard.ts`, `controller/current-user.decorator.ts`    |
| Module wiring (logic-free)               | `module/<feature>.module.ts`                                                           | `module/contribution.module.ts`                                        |
| Barrel export                            | `index.ts` in every folder                                                             | —                                                                      |

**General TypeScript**

- Classes / interfaces / enums: PascalCase
- Variables / functions / properties: camelCase
- True constants only: UPPER_SNAKE_CASE (business rules live in
  `SystemSettings`, not hardcoded constants)

**API**

- Routes: kebab-case, plural nouns, versioned — `/api/v1/contribution-payments`
- Uniform response envelope: `{ success, data, message }`
- Global exception filters (per condition, colocated in `controller/`) —
  no ad-hoc error shapes per controller

**Git / workflow**

- Branches: `feature/IKM-<ticket>-short-desc`, `fix/IKM-<ticket>-short-desc`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`)
- PR titles mirror the ticket: `[IKM-101] Add contribution payment approval endpoint`
- **One ticket = one branch = one PR.** A PR merges only after lint passes, tests pass, and at least one review approval.
- Minimum test coverage on `application/` services: 70% before merge.

## 7. Project structure

```
src/
├── main.ts                          # bootstrap
├── main.module.ts                   # root module, imports everything in module/
├── setup-app.ts                     # global pipes, filters, Swagger wiring
│
├── module/                          # NestJS wiring only — no logic
│   ├── auth.module.ts
│   ├── member.module.ts
│   ├── contribution.module.ts
│   ├── penalty.module.ts
│   ├── withdrawal.module.ts
│   ├── monthly-obligation.module.ts
│   ├── system-settings.module.ts
│   ├── transaction.module.ts
│   ├── dashboard.module.ts
│   ├── report.module.ts
│   ├── statement.module.ts
│   ├── notification.module.ts
│   └── audit-log.module.ts
│
├── controller/
│   ├── index.ts
│   ├── current-user.decorator.ts
│   ├── roles.decorator.ts
│   ├── roles.guard.ts
│   ├── authentication.guard.ts
│   ├── authentication.guard.mock.ts
│   ├── not-found.exception-filter.ts
│   ├── access-denied.exception-filter.ts
│   ├── authentication/
│   ├── member/
│   ├── contribution/
│   ├── penalty/
│   ├── withdrawal/
│   ├── monthly-obligation/
│   ├── system-settings/
│   ├── transaction/
│   ├── dashboard/
│   ├── report/
│   ├── statement/
│   ├── notification/
│   └── audit-log/
│
├── application/
│   ├── index.ts
│   ├── not-found.error.ts
│   ├── access-denied.error.ts
│   ├── time-provider.interface.ts   # injectable clock, makes due-date/penalty logic testable
│   ├── time-provider.ts
│   ├── time-provider.mock.ts
│   ├── authentication/
│   ├── member/
│   ├── contribution/
│   ├── penalty/
│   ├── withdrawal/
│   ├── monthly-obligation/
│   ├── system-settings/
│   ├── transaction/
│   ├── dashboard/
│   ├── report/
│   ├── statement/
│   ├── notification/
│   └── audit-log/
│
├── persistence/                     # flat — one file per feature, no subfolders
│   ├── index.ts
│   ├── database-connection.ts
│   ├── database-connection.interface.ts
│   ├── database-connection.config.ts
│   ├── database-connection.mock.ts
│   ├── member.repository.ts
│   ├── contribution.repository.ts
│   ├── penalty.repository.ts
│   ├── withdrawal.repository.ts
│   ├── monthly-obligation.repository.ts
│   ├── system-settings.repository.ts
│   ├── transaction.repository.ts
│   ├── report.repository.ts
│   ├── notification.repository.ts
│   ├── audit-log.repository.ts
│   ├── storage.ts                   # S3/Cloudinary adapter, same pattern as database-connection
│   ├── storage.interface.ts
│   ├── storage.mock.ts
│   ├── mail.ts                      # SMTP adapter
│   ├── mail.interface.ts
│   └── mail.mock.ts
│
├── helper/
└── util/

migrations/                          # node-pg-migrate, hand-written SQL up/down
pgmigrate.config.json
```

<!-- ## 8. Authentication Sprint 1 Implementation

This section records the completed authentication and authorization work for
IKM-1.1 through IKM-1.7, including refresh-token persistence, logout, password
change, guards, tests, and the database migration.

### 8.1 Completed tickets

| Ticket  | Implementation                                                                             | Result                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| IKM-1.1 | User records, password hashing, login validation, and environment-backed JWT configuration | Passwords are stored as bcrypt hashes; plaintext passwords are never persisted or returned                      |
| IKM-1.2 | `JwtAuthGuard`, role metadata, and `RolesGuard`                                            | Access-token authentication and role authorization are available as reusable NestJS guards                      |
| IKM-1.3 | `POST /auth/login`                                                                         | Valid active users receive an access token and a refresh token                                                  |
| IKM-1.4 | Access-token verification                                                                  | Missing, malformed, expired, and incorrectly signed access tokens return `401`                                  |
| IKM-1.5 | `POST /auth/refresh`                                                                       | Refresh tokens are verified, checked against the database, rotated, and replaced with a new access/refresh pair |
| IKM-1.6 | `POST /auth/logout`                                                                        | One refresh token or every refresh token for the user can be revoked                                            |
| IKM-1.7 | `POST /auth/change-password`                                                               | An authenticated user can verify the current password, set a new password, and revoke all refresh sessions      |

The running application currently exposes these routes under `/auth`. A
global `/api/v1` prefix has not been configured in `main.ts`, so clients should
use `/auth/...` until API versioning is enabled.

### 8.2 Files changed and why

#### Database and dependencies

| File                                                   | Reason                                                                                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/1000000000000002_create-refresh-tokens.ts` | Creates `refresh_tokens`, indexes token and member lookup, and cascades token cleanup when a user is deleted. The foreign key references the existing `users` table. |
| `package.json`                                         | Declares `dotenv` for isolated Vitest environment loading and `ms` for refresh-token expiration calculation.                                                         |
| `package-lock.json`                                    | Records the dependency versions installed for reproducible installs.                                                                                                 |

#### Authentication application layer

| File                                                                   | Reason                                                                                                                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/application/authentication/authentication.service.ts`             | Implements login, refresh-token verification and rotation, replay detection, logout revocation, password change, JWT signing, and expiry calculation.           |
| `src/application/authentication/authentication.service.interface.ts`   | Defines the application port for login, refresh, logout, and password change without exposing persistence details to controllers.                               |
| `src/application/authentication/authentication.service.test.ts`        | Unit-tests active refresh, inactive users, invalid and expired tokens, replay detection, single/all-device logout, and password changes.                        |
| `src/application/authentication/user.repository.interface.ts`          | Adds the `updatePasswordHash` persistence operation.                                                                                                            |
| `src/application/authentication/user.repository.mock.ts`               | Adds the password-update test double required by the expanded repository interface.                                                                             |
| `src/application/authentication/token-hasher.interface.ts`             | Defines the SHA-256 token-hashing port and dependency-injection token.                                                                                          |
| `src/application/authentication/token-hasher.mock.ts`                  | Provides a deterministic token hash for unit tests.                                                                                                             |
| `src/application/authentication/refresh-token.ts`                      | Defines the domain shape of a persisted refresh token.                                                                                                          |
| `src/application/authentication/refresh-token.repository.interface.ts` | Defines create, active lookup, single revocation, all-session revocation, and atomic rotation operations.                                                       |
| `src/application/authentication/refresh-token.repository.mock.ts`      | Provides an in-memory refresh-token repository for service tests.                                                                                               |
| `src/module/authentication.module.ts`                                  | Registers the token hasher and refresh-token repository providers so the application service receives persistence adapters through NestJS dependency injection. |

#### Persistence layer

| File                                               | Reason                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/persistence/token-hasher.ts`                  | Hashes high-entropy refresh tokens with deterministic SHA-256 so the database can use indexed equality lookup.           |
| `src/persistence/refresh-token.repository.ts`      | Implements refresh-token SQL operations and uses `IDatabaseConnection.transaction()` for revoke-and-insert rotation.     |
| `src/persistence/user.repository.ts`               | Updates `users.password_hash` during password change.                                                                    |
| `src/persistence/database-connection.interface.ts` | Existing transaction/query port used by the refresh-token repository.                                                    |
| `src/module/database.module.ts`                    | Re-exports the database token for integration-test access without violating controller-to-persistence import boundaries. |

#### Controller and HTTP layer

| File                                                                          | Reason                                                                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/controller/authentication/authentication.controller.ts`                  | Adds refresh, logout, and guarded change-password routes and Swagger operation metadata.                                     |
| `src/controller/authentication/authentication.dto.ts`                         | Validates refresh tokens, logout options, login input, and minimum eight-character new passwords.                            |
| `src/controller/authentication/authentication.controller.integration-test.ts` | Verifies the complete HTTP/database flow for login, refresh, inactive users, replay/revocation, logout, and password change. |
| `src/controller/authentication.guard.ts`                                      | Existing access-token guard used by the protected password-change route.                                                     |
| `src/controller/current-user.decorator.ts`                                    | Existing decorator that supplies the authenticated user identity to password change.                                         |
| `src/controller/response.interceptor.ts`                                      | Maintains the `{ success, data, message }` response envelope and supports endpoint-specific success messages.                |
| `src/controller/roles.decorator.ts`                                           | Defines route role metadata for authorization.                                                                               |
| `src/controller/roles.guard.ts`                                               | Enforces `MEMBER` and `ADMIN` route restrictions.                                                                            |
| `src/controller/roles.guard.test.ts`                                          | Tests unrestricted routes, matching roles, missing users, and denied roles.                                                  |

#### Test configuration

| File                            | Reason                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `vitest.integration.config.mts` | Loads the integration setup file in every Vitest worker.                                                             |
| `vitest.integration.setup.ts`   | Loads `.env.local` and `.env` before integration tests so workers do not depend on another test file's side effects. |

### 8.3 Refresh-token design

Only a hash of a refresh token is stored. The raw token is returned once to
the client and is never written to the database.

- Passwords use bcrypt because they are user-chosen secrets.
- Refresh tokens use SHA-256 because they are server-generated, high-entropy
  values and need deterministic indexed lookup.
- `refresh_tokens.token_hash` identifies the token without exposing the raw
  credential if the database is read.
- `revoked_at IS NULL` identifies an active token.
- `expires_at` is checked in the application even though the JWT also carries
  its own expiry.
- Each refresh rotates the old row into a revoked state and inserts a new row
  in one database transaction.

### 8.4 Final request workflows

#### Login: `POST /auth/login`

```text
Validate LoginDto
    -> find user by email
    -> verify bcrypt password
    -> require ACTIVE status
    -> sign access JWT
    -> sign refresh JWT
    -> SHA-256 hash refresh JWT
    -> persist active refresh_tokens row
    -> return access token, refresh token, and safe user data
```

#### Refresh: `POST /auth/refresh`

```text
Validate RefreshTokenDto
    -> verify refresh JWT signature and expiry
    -> hash received refresh token
    -> find matching active database row
    -> load user and require ACTIVE status
    -> reject expired database rows
    -> atomically revoke old row and insert new refresh row
    -> issue new access token and refresh token
```

If a refresh JWT is valid but has no active database row, it is treated as a
replay or reuse signal. All refresh tokens for that user are revoked and the
request returns `401`.

#### Logout: `POST /auth/logout`

```text
Validate LogoutDto
    -> verify refresh JWT
    -> if allDevices=true, revoke every active row for the user
    -> otherwise hash the supplied token and revoke only its row
    -> return success without exposing token data
```

Logout is idempotent for an invalid or already-expired token: there is nothing
active to revoke, so the endpoint returns successfully after validation.

#### Change password: `POST /auth/change-password`

```text
Validate access JWT with JwtAuthGuard
    -> obtain user id from @CurrentUser()
    -> validate ChangePasswordDto
    -> load the current user
    -> verify current password with bcrypt
    -> reject if the new password equals the current password
    -> hash and persist the new password
    -> revoke all refresh sessions for the user
    -> return success without password data
```

### 8.5 Setup and verification

Create `.env.local` or `.env` from `.env.example` and provide a dedicated
Neon test-branch `DATABASE_URL`. The JWT secrets must each be at least 32
characters long.

```powershell
npm install
npm run migrate:up
npm run build
npm test
npm run test:integration
npm run lint
npm start:dev
```

Swagger is available at `/api/docs` while the server is running. The
integration suite uses the configured Neon database and removes its temporary
users and test rows during teardown.

The migration was applied successfully with `npm run migrate:up`:

```text
1000000000000002_create-refresh-tokens (UP)
```

The final verification completed with 25 unit tests and 14 integration tests
passing, with build and lint also passing. Neon may print an SSL-mode warning
about future `pg` semantics; that warning does not indicate a test failure. -->

## 9. Out of scope for now

Not built in the current roadmap (may be revisited later):
mobile money/bank integration, WhatsApp bot, profit-sharing module,
investment return tracking, native mobile apps.
