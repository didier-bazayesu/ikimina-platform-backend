# Gents Ikimina Backend — Sprint Plan

Process rule for every sprint: **one ticket = one branch = one PR.**
A sprint is not "done" until all its PRs are reviewed, approved, and merged.
The next sprint does not start until the current one is fully merged.

Ticket IDs use the prefix `IKM-<sprint>.<ticket>` (e.g. `IKM-0.1`).

---

## Sprint 0 — Foundation

Goal: the repo is production-shaped before any feature/business logic exists.

### IKM-0.1 — README + repo scaffold
- **Description:** Add `README.md` covering project overview, roles, core
  flow, tech stack, naming conventions, and workflow rules.
- **Acceptance criteria:**
  - README committed at repo root, matches the agreed conventions
  - `.gitignore`, `.editorconfig` added
  - Local setup section present but stubbed (filled in later tickets)

### IKM-0.2 — NestJS project init + layer-first skeleton + lint/format/hooks
- **Description:** Initialize the Nest app with the layer-first hexagonal
  skeleton (`main.ts`, `main.module.ts`, `setup-app.ts`, `module/`,
  `controller/`, `application/`, `persistence/`, `helper/`, `util/`) and
  code quality tooling. No real feature logic yet — just the empty,
  committed structure plus one throwaway sample vertical slice (e.g. a
  `health` feature) proving the full chain works end to end.
- **Acceptance criteria:**
  - `nest new` project boots (`npm run start:dev`)
  - All layer folders exist per README §7
  - Sample `health` feature demonstrates the full chain: `controller/health/health.controller.ts`
    → `application/health/health.service.interface.ts` (inbound port)
    → `application/health/health.service.ts` (implementation)
    → `application/health/health.repository.interface.ts` (outbound port)
    → `persistence/health.repository.ts` (implementation)
    → `module/health.module.ts` (DI binding)
  - Colocated `.mock.ts` test doubles exist for both interfaces, and
    `health.service.test.ts` unit-tests the service using the repository mock
    (no real database involved)
  - ESLint rule that fails if anything under `application/**` imports from
    `persistence/**` or the `pg` package directly — the automated guard for
    the dependency rule
  - ESLint + Prettier configured and passing on a clean tree
  - Husky pre-commit hook runs lint + format check
  - `npm run lint` and `npm run format` scripts exist

### IKM-0.3 — PostgreSQL + raw `pg` connection + node-pg-migrate
- **Description:** Add PostgreSQL via Docker, a raw `pg`-based database
  connection adapter (no ORM), and `node-pg-migrate` for hand-written,
  auditable schema migrations.
- **Acceptance criteria:**
  - `docker-compose.yml` spins up Postgres
  - `persistence/database-connection.ts` (pg `Pool` wrapper),
    `database-connection.interface.ts` (the port every repository depends on),
    `database-connection.config.ts` (reads connection settings from env),
    `database-connection.mock.ts` (in-memory test double)
  - `node-pg-migrate` installed and configured (`pgmigrate.config.json`),
    `/migrations` folder at repo root
  - First migration committed (can be a no-op/placeholder table) proving
    `migrate up` and `migrate down` both work
  - README local-setup section updated with exact commands (`docker compose up`, `migrate up`, `migrate down`, seed if applicable)

### IKM-0.4 — Environment config module
- **Description:** Centralize and validate environment variables.
- **Acceptance criteria:**
  - `@nestjs/config` set up as a global module
  - Validation schema (e.g. Joi/Zod) rejects missing/invalid env vars on boot
  - Covers DB connection vars, JWT secret, storage/mail credentials
  - `.env.example` committed with every required variable documented

### IKM-0.5 — Storage & mail adapters (persistence/)
- **Description:** Add file storage and email as flat adapters in
  `persistence/`, following the exact same interface/implementation/mock
  pattern as `database-connection.*`, so no `application/<feature>` service
  ever talks to the S3/Cloudinary or SMTP SDK directly.
- **Acceptance criteria:**
  - `persistence/storage.ts` + `storage.interface.ts` + `storage.mock.ts`
    with `upload()` / `getUrl()` / `delete()`
  - `persistence/mail.ts` + `mail.interface.ts` + `mail.mock.ts` with `send()`
  - Any `application/<feature>` service depends only on the interface,
    injected via its feature's `module/<feature>.module.ts`
  - Unit tests use the `.mock.ts` doubles, never real network calls

### IKM-0.6 — Global exception filters + response envelope
- **Description:** Standardize every API response and error shape,
  colocated in `controller/` per the reference project's pattern (one
  filter file per error condition, not one giant catch-all).
- **Acceptance criteria:**
  - `controller/not-found.exception-filter.ts`, `controller/access-denied.exception-filter.ts`
    (and any other condition-specific filters as they're needed) registered in `setup-app.ts`
  - Success responses wrapped as `{ success, data, message }`
  - Error responses wrapped as `{ success: false, message, error }`
  - Validation errors (class-validator, via the global `ValidationPipe` in `setup-app.ts`) formatted consistently

### IKM-0.7 — Swagger setup
- **Description:** API documentation available from boot, wired through `setup-app.ts` (same pattern as the reference project's `configureOpenAPI`).
- **Acceptance criteria:**
  - `/api/docs` serves Swagger UI
  - Bearer auth scheme documented
  - At least one sample endpoint documented as a pattern for future modules

### IKM-0.8 — CI skeleton
- **Description:** Automated checks run on every PR.
- **Acceptance criteria:**
  - CI pipeline runs lint + unit tests on every PR
  - PR cannot merge if the pipeline fails (branch protection)

---

## Sprint 1 — Authentication
- User schema (`User` model, password hashing with bcrypt/argon2)
- `POST /auth/login`
- JWT strategy (access + refresh tokens)
- `JwtAuthGuard`, `RolesGuard`, `@Roles()` decorator
- `POST /auth/logout`, `POST /auth/refresh`

## Sprint 2 — Members
- `Member` model linked to `User` (see README §3 — User = identity, Member = Ikimina membership)
- Create / list / get / update member (Admin only)
- Suspend / activate member
- `GET /members/me` (own profile, Member role)

## Sprint 3 — System Settings
- `SystemSettings` model: monthly share amount, penalty %, due day, currency
- Admin CRUD on settings
- Enforce that historical obligations snapshot values at creation time (never retroactive)

## Sprint 4 — Monthly Obligations Engine
- `MemberMonthlyObligation` model (member, month, year, expected amount, status)
- Job/service to generate obligations per active member per period
- Query: obligations by member, missing months, status

## Sprint 5 — Contributions
- `ContributionPayment` + `ContributionAllocation` models
- Submit payment (amount, date, months covered, method, reference, notes, proof upload)
- Full-month-only allocation validation
- Admin: list pending, approve, reject (with reason), audit trail
- Member: list own payments/allocations

## Sprint 6 — Penalties
- `Penalty` model, statuses: `UNPAID`, `PENDING`, `PAID`, `WAIVED`
- Daily idempotent scheduler generating penalties for obligations past due day
- Member: submit penalty payment (same evidence flow as contributions)
- Admin: approve/reject penalty payment, waive penalty

## Sprint 7 — Withdrawals
- `Withdrawal` model (amount, date, beneficiary, category, description, supporting doc)
- Single-admin creation = immediately recorded, full audit log entry created
- List/filter withdrawals

## Sprint 8 — Transactions / Ledger
- Unified read-model combining contributions, penalty payments, withdrawals
- `GET /transactions` with filters (member, type, status, date range)

## Sprint 9 — Dashboards
- `GET /dashboards/member` — computed values only, never stored totals
- `GET /dashboards/admin` — member stats, financial stats, transaction stats

## Sprint 10 — Reports
- Contribution report (daily/weekly/monthly/yearly/custom range)
- Penalty report (generated/paid/outstanding/waived)
- Defaulters report (member, missing months, total penalties)
- Withdrawal report, financial summary report
- Export (CSV/PDF)

## Sprint 11 — Statements
- Member PDF statement: personal info, contributions, penalties, withdrawals (if any), current standing

## Sprint 12 — Notifications
- `MailService` abstraction + in-app `Notification` model
- Events: contribution due reminder (3 days before), penalty generated, transaction approved/rejected

## Sprint 13 — Audit Logs
- `AuditLog` model: user, action, previous value, new value, timestamp, IP address
- Write on every state-changing Admin action (approve/reject/waive/suspend/withdraw/settings change)

## Sprint 14 — Hardening
- Rate limiting on auth and submission endpoints
- Database indexes on high-traffic query paths (member_id, month/year, status)
- Security pass (input validation, file upload MIME/size checks, secure headers)
- Test coverage audit against the 70% gate
- Load/sanity check on the penalty scheduler with realistic member volume

---

## Open items to resolve before/at Sprint 7
- Confirm final wording of the audit log entry format for withdrawals (what fields are mandatory)

## Defaults in effect unless you say otherwise
- Timezone: `Africa/Kigali`
- Email: generic SMTP behind `MailService`, provider swappable later
- Test coverage gate: 70% on services/business logic