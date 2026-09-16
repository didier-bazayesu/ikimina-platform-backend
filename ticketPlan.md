# Sprint 0 — Foundation

Template used: **Setup Ticket** (these are not API stories — no endpoint,
no authorization rules — so the format is Goal / Requirements+Why /
Acceptance Criteria / Dependencies / Out of Scope / Code Quality instead).

Process reminder: one ticket = one branch = one PR. Branch names
`feature/IKM-0.X-short-desc`. No ticket in this sprint is "done" until its
PR has passed lint + tests + at least one review approval.

---

## IKM-0.1 — README + repo scaffold

### Goal

Every ticket after this one assumes shared context — roles, the financial
flow, naming conventions, the PR workflow. Without a written source of
truth, that context has to be re-explained in every PR review, and drifts
the moment two people remember a decision differently.

### Description

Add `README.md` documenting: project overview, the two roles (Member,
Admin), the core financial lifecycle (obligation → payment → approval →
ledger, and the penalty scheduler), the tech stack, the hexagonal
architecture and its dependency rule, the naming conventions table, and the
Git/PR workflow. Add `.gitignore` and `.editorconfig`.

### Requirements + why

| Requirement                    | Why it's required                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles section                  | Every future Authorization section in every ticket references these two roles — they must be defined once, not per-ticket                                                                 |
| Core flow diagrams             | The obligation → payment → approval → ledger loop is the single most important business rule in the system; writing it down prevents a subtly-wrong implementation three sprints from now |
| Tech stack section             | Prevents a contributor from introducing an incompatible dependency (e.g. adding an ORM after we deliberately chose raw `pg`)                                                              |
| Naming conventions table       | Reviewers need an objective reference to enforce consistency against — without it, naming feedback in PRs is just opinion                                                                 |
| Git/PR workflow section        | Defines what "done" means for every ticket (lint, tests, review) so merge criteria aren't decided ad hoc per PR                                                                           |
| `.gitignore` / `.editorconfig` | Prevents `node_modules`/`.env` from being committed and prevents whitespace/indentation diffs from cluttering every PR                                                                    |

### Acceptance Criteria

- [ ] `README.md` committed at repo root, covers all sections above
- [ ] `.gitignore` excludes `node_modules`, `dist`, `.env`, coverage output
- [ ] `.editorconfig` enforces consistent indentation/line endings
- [ ] Local setup section present but stubbed (filled in by later tickets)

### Dependencies

None — this is the first ticket.

### Out of Scope

Any actual application code, migrations, or CI configuration — those are
separate tickets.

### Code Quality

- [ ] Reviewed by at least one other contributor for accuracy against the
      decisions actually agreed on (not just for spelling)

---

## IKM-0.2 — NestJS project init + layer-first skeleton + lint/format/hooks

### Goal

Prove the hexagonal dependency rule is enforceable in this codebase — not
just documented — before any real feature is built on top of it. Every
later ticket depends on this skeleton existing and on the guardrail that
prevents `application/` from reaching into `persistence/` directly.

### Description

Initialize the Nest app with the layer-first skeleton (`main.ts`,
`main.module.ts`, `setup-app.ts`, `module/`, `controller/`, `application/`,
`persistence/`, `helper/`, `util/`). Build one throwaway vertical slice
(`health`) that exercises the full chain end to end, plus the lint rule
that makes violating the dependency rule a build failure, not a review
comment.

### Requirements + why

| Requirement                                                                                                            | Why it's required                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full folder skeleton per README §7                                                                                     | Every subsequent ticket needs a folder to land in — without this, the first real feature ticket would also have to invent the skeleton, mixing concerns                 |
| `health` vertical slice (controller → service interface → service → repository interface → repository → module wiring) | This is the cheapest possible way to prove the pattern actually compiles and runs before committing to it for 13 more feature modules                                   |
| Colocated `.mock.ts` doubles + `health.service.test.ts`                                                                | Proves the whole reason for the interface boundary — testing `application/` logic with zero real database or HTTP server — actually works in this project's Jest config |
| ESLint rule blocking `application/**` → `persistence/**` or `pg` imports                                               | Turns the dependency rule from a convention reviewers might miss into something CI catches automatically                                                                |
| ESLint + Prettier + Husky pre-commit                                                                                   | Catches style/lint issues before they reach a PR, so review time is spent on logic, not formatting                                                                      |

### Acceptance Criteria

- [ ] `npm run start:dev` boots the app successfully
- [ ] All layer folders exist per README §7
- [ ] `health` slice demonstrates the full chain with real DI wiring in `module/health.module.ts`
- [ ] `health.service.test.ts` passes using only the repository mock (no live DB)
- [ ] Custom ESLint rule fails the build if `application/**` imports from `persistence/**` or `pg`
- [ ] `npm run lint` and `npm run format` scripts exist and pass on a clean tree
- [ ] Husky pre-commit hook runs lint + format check

### Dependencies

IKM-0.1 (README defines the structure being built here)

### Out of Scope

Real database connectivity (IKM-0.3), real feature modules (Sprint 1+)

### Code Quality

- [ ] No linting errors or warnings
- [ ] `health` slice deleted or clearly marked as a throwaway reference once Sprint 1 has a real precedent to point to instead

---

## IKM-0.3 — Neon PostgreSQL connection (`pg.Pool`) + node-pg-migrate

### Goal

Give every future repository a single, tested way to reach the database —
with real transaction and row-locking support, which this project's
financial writes require (IKM-5.1, IKM-5.4, IKM-4.2) — and give the
project auditable, hand-written schema history.

### Description

Connect to Neon-hosted PostgreSQL (used for **every** environment — dev,
test, CI, prod; no local database service to install or run) via a
standard `pg.Pool` over Neon's normal Postgres wire-protocol endpoint, and
add `node-pg-migrate` for schema migrations. Deliberately **not** using
`@neondatabase/serverless`'s HTTP driver (`neon()`) — that driver is
stateless per-request and cannot hold a multi-statement transaction or a
row lock across calls, which the payment-approval flow depends on.

### Requirements + why

| Requirement                                                                              | Why it's required                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neon project with a branch per environment (e.g. `dev`, `test`/CI, `prod`)               | Removes the need for local Docker entirely — everyone points at the same hosted Postgres, and Neon's branching gives test runs an isolated, resettable database without extra tooling                                                                                              |
| `database-connection.ts` (`pg.Pool` wrapper, SSL enabled)                                | Centralizes connection pooling against Neon's `DATABASE_URL` so no repository opens its own connection                                                                                                                                                                             |
| `database-connection.interface.ts` exposing `query()` **and** `transaction<T>(callback)` | `transaction()` is what makes atomic multi-row writes and `SELECT ... FOR UPDATE` locking possible — a plain `query()`-only interface can't express "hold this lock across two statements." No Neon-specific types leak through this interface — it's driver-agnostic on purpose   |
| `database-connection.mock.ts`                                                            | Lets `application/*.service.test.ts` run without touching Postgres, including tests that exercise the `transaction()` path                                                                                                                                                         |
| `node-pg-migrate` + `/migrations` + `pgmigrate.config.json`, pointed at `DATABASE_URL`   | Every schema change becomes a reviewable, ordered, hand-written SQL file — critical for auditing what ran against a financial database, and for reliable rollback. Runs fine against Neon since migrations use a normal Postgres connection, unaffected by the app's driver choice |
| First placeholder migration                                                              | Proves `migrate up` and `migrate down` both work before any real table depends on the tooling being correct                                                                                                                                                                        |

### Acceptance Criteria

- [ ] `persistence/database-connection.ts`, `.interface.ts`, `.mock.ts` implemented; no separate `.config.ts` (dead weight once connection is a single `DATABASE_URL` — see Code Quality)
- [ ] `IDatabaseConnection.transaction()` verified with a test that runs two writes inside one callback and confirms both roll back together on a thrown error
- [ ] `node-pg-migrate` configured against `DATABASE_URL`; `/migrations` folder exists at repo root
- [ ] First migration committed; both `migrate up` and `migrate down` verified to work against the `test`/CI Neon branch
- [ ] README local-setup section updated: no Docker step, just `DATABASE_URL` in `.env`

### Dependencies

IKM-0.2 (skeleton must exist; `health.repository.ts` shows the pattern this will plug into)

### Out of Scope

Any real domain table (Users, Members, etc.) — those migrations belong to
the sprint that introduces that feature

### Code Quality

- [ ] No SDK type (Neon-specific or otherwise) appears in `database-connection.interface.ts` — the port stays driver-agnostic even though the current adapter happens to target Neon
- [ ] Connection pool sizing read from env (`DB_MAX_CONNECTIONS`), not hardcoded
- [ ] Any code inside a `transaction()` callback uses only the `query` function passed into that callback — never the outer `IDatabaseConnection.query()`, which runs on a different connection and wouldn't see the lock or uncommitted writes

---

## IKM-0.4 — Environment config module

### Goal

Prevent the app from starting in a half-configured state — a missing DB
password or JWT secret should fail loudly at boot, not cause a confusing
runtime error hours later.

### Description

Centralize and validate all environment variables through
`@nestjs/config`.

### Requirements + why

| Requirement                                                         | Why it's required                                                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nestjs/config` as a global module                                 | Avoids every feature module re-reading `process.env` directly, which makes required variables invisible and untestable                                   |
| Validation schema (Joi/Zod) that fails boot on missing/invalid vars | Turns configuration mistakes into an immediate, obvious startup failure instead of a silent bug in production                                            |
| Coverage for DB, JWT, storage, and mail credentials                 | These are the four external dependencies every other sprint will need — defining them once now avoids each later sprint inventing its own config pattern |
| `.env.example` committed                                            | Documents exactly what a new contributor needs to set up locally, without exposing real secrets                                                          |

### Acceptance Criteria

- [ ] App refuses to boot if any required env var is missing or malformed
- [ ] `.env.example` lists every variable with a description
- [ ] Config values are injected via `ConfigService`, never read from `process.env` directly in feature code

### Dependencies

IKM-0.2

### Out of Scope

Secret management/rotation in a deployed environment (e.g. a secrets
manager) — out of scope until deployment is planned

### Code Quality

- [ ] No secrets committed anywhere, including `.env.example`

---

## IKM-0.5 — Storage & mail adapters (persistence/)

### Goal

Every later sprint that needs file upload (Contributions, Penalties,
Withdrawals) or notifications (Sprint 12) should depend on an interface,
not a specific SDK — so the provider can change without touching business
logic, and so those services are unit-testable without hitting a real
cloud provider or SMTP server.

### Description

Add file storage (S3/Cloudinary) and email as flat adapters in
`persistence/`, following the same interface/implementation/mock pattern
established by `database-connection.*` in IKM-0.3.

### Requirements + why

| Requirement                                                                             | Why it's required                                                                                                                  |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `storage.ts` + `storage.interface.ts` + `storage.mock.ts`                               | Lets Sprint 5 (Contributions) build proof-of-payment upload against an interface, swappable later, testable now                    |
| `mail.ts` + `mail.interface.ts` + `mail.mock.ts`                                        | Same reasoning for Sprint 12 (Notifications) — and for IKM-2.1 in Sprint 2, which needs to email a new member's temporary password |
| Exposed only via each feature's own port, injected through `module/<feature>.module.ts` | Keeps the dependency rule intact — `application/<feature>` never imports the S3 or SMTP SDK directly                               |

### Acceptance Criteria

- [ ] `persistence/storage.ts` implements `upload()`, `getUrl()`, `delete()`
- [ ] `persistence/mail.ts` implements `send()`
- [ ] Both have colocated `.interface.ts` and `.mock.ts`
- [ ] Unit tests use the mocks — no test makes a real network call

### Dependencies

IKM-0.2, IKM-0.4 (needs config for credentials)

### Out of Scope

Actual email templates/content (defined per-feature when that feature needs
to send one, starting with IKM-2.1)

### Code Quality

- [ ] No SDK types leak outside `persistence/storage.ts` / `persistence/mail.ts`

---

## IKM-0.6 — Global exception filters + response envelope

### Goal

Every ticket from Sprint 1 onward returns errors — 400s, 401s, 403s, 404s.
Deciding the shape of those responses once now means the "Possible
Responses" table in every future ticket can just declare a status code,
not redesign the error body each time.

### Description

Add condition-specific exception filters (colocated in `controller/`, one
file per condition) and a consistent success/error response envelope,
wired through `setup-app.ts`.

### Requirements + why

| Requirement                                                                                                       | Why it's required                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `controller/not-found.exception-filter.ts`, `controller/access-denied.exception-filter.ts` (and others as needed) | One file per error condition keeps each filter small and easy to reason about, rather than one large catch-all with branching logic |
| Uniform `{ success, data, message }` / `{ success: false, message, error }` envelope                              | Frontend/API consumers can rely on one response shape regardless of which endpoint they call                                        |
| Global `ValidationPipe` in `setup-app.ts` with consistent 400 formatting                                          | Every DTO validation failure across all 14 future modules looks the same, rather than each controller handling it differently       |

### Acceptance Criteria

- [ ] All thrown domain errors map to the correct HTTP status and envelope shape
- [ ] Validation errors return 400 with field-level detail
- [ ] Unhandled errors return 500 without leaking stack traces in the response body

### Dependencies

IKM-0.2

### Out of Scope

Feature-specific exception filters (e.g. `duplicate-member-number.exception-filter.ts`) — added when that feature is built

### Code Quality

- [ ] No controller manually constructs its own error response shape

---

## IKM-0.7 — Swagger setup

### Goal

Every endpoint built from Sprint 1 onward needs to be documented per its
ticket's "API Documentation" acceptance criteria — this ticket makes that
possible from the first real endpoint, not retrofitted later.

### Description

Wire up Swagger/OpenAPI through `setup-app.ts`, with Bearer auth
documented, matching the reference project's `configureOpenAPI` pattern.

### Requirements + why

| Requirement                          | Why it's required                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `/api/docs` serving Swagger UI       | Gives a live, always-current reference for every endpoint without maintaining a separate document    |
| Bearer auth scheme documented        | Every protected endpoint from Sprint 1 onward needs this to be testable directly from the Swagger UI |
| One sample endpoint fully documented | Establishes the exact `@ApiTags`/`@ApiResponse` pattern every future controller ticket should copy   |

### Acceptance Criteria

- [ ] `/api/docs` loads and lists the sample endpoint
- [ ] Bearer auth is selectable and applies to protected routes in the UI
- [ ] 200/400/401/403/500 response shapes documented on the sample endpoint

### Dependencies

IKM-0.2, IKM-0.6 (response shapes must exist to document them accurately)

### Out of Scope

Documenting real feature endpoints — each feature ticket documents its own

### Code Quality

- [ ] Swagger decorators kept in the controller layer only, never in `application/`

---

## IKM-0.8 — CI skeleton

### Goal

"No linting errors, all tests pass" needs to be enforced automatically —
otherwise it silently degrades into a suggestion the first time someone is
in a hurry.

### Description

Add a CI pipeline that runs lint and tests on every PR, with branch
protection preventing merge on failure.

### Requirements + why

| Requirement                                       | Why it's required                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| CI runs `npm run lint` and `npm test` on every PR | Makes the Definition of Done in every ticket's Code Quality section machine-enforced, not honor-system |
| Branch protection blocking merge on failure       | Removes the possibility of merging a red PR "just this once"                                           |

### Acceptance Criteria

- [ ] CI pipeline triggers on every PR against the main branch
- [ ] A PR with a failing test or lint error is blocked from merging
- [ ] A green PR shows a clear passing status before merge is allowed

### Dependencies

IKM-0.2 through IKM-0.7 (there needs to be something to lint and test)

### Out of Scope

Deployment pipelines, staging/production environments — CI here means
lint + test only

### Code Quality

- [ ] Pipeline run time kept reasonable (no unnecessary steps blocking every PR)
