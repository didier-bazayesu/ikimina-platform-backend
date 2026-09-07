# Sprint 4 — Monthly Obligations Engine

One ticket template used throughout: IKM-4.1 and IKM-4.2 are **Setup
Tickets**; IKM-4.3 and IKM-4.4 are **API Story Tickets**.

**Note on a Sprint 0 gap:** README §7's project structure lists
`application/time-provider.interface.ts` / `.ts` / `.mock.ts` (an
injectable clock, needed for testable due-date logic) at the `application/`
root, but no Sprint 0 ticket actually creates it. Since nothing has been
implemented yet, IKM-4.2 below absorbs building it — it's the first ticket
that actually needs it. If you'd rather it live in Sprint 0 formally (as
an addendum, like IKM-1.7), say so and I'll move it.

---

## IKM-4.1 — Monthly obligation schema, entity & repository

### Goal
README §3 calls the monthly obligation "the anchor for everything else in
the system" — missing months, penalties, dashboards, reports, and
statements all read from it. Every one of those (Sprints 5–11) needs a
trustworthy, non-duplicable obligation record to exist first.

### Description
Create the `monthly_obligations` table, snapshotting the settings values
that applied at creation time (per README §3's immutability rule — never a
live reference back to `system_settings`), plus the domain entity, status
enum, and repository interface/mock pair.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `monthly_obligations` migration: `id`, `member_id` (FK → `members.id`), `month` (1–12), `year`, `expected_amount`, `due_day`, `currency`, `status`, `created_at` | `expected_amount`, `due_day`, and `currency` are **copied** from `system_settings` at creation time, not referenced live — this is the concrete implementation of "historical values are immutable" from README §3 |
| `UNIQUE (member_id, month, year)` | This is what makes obligation generation idempotent at the database level — even if the generation job (IKM-4.2) runs twice, a duplicate insert simply fails rather than creating a second obligation for the same period |
| FK `member_id → members.id`, `ON DELETE RESTRICT` | Consistent with the rest of the schema — obligations must never be silently orphaned or cascade-deleted |
| `MonthlyObligationStatus` enum: `UNPAID`, `PAID` | Deliberately minimal — the actual payment *lifecycle* (submitted, pending, approved, rejected) belongs to `ContributionPayment` (Sprint 5), a separate entity. The obligation only tracks whether the month is settled |
| `application/monthly-obligation/monthly-obligation.ts` domain entity | Typed representation for every service in this sprint and beyond |
| `monthly-obligation.repository.interface.ts` + `.mock.ts` | Lets IKM-4.2's generator and IKM-4.3/4.4's read endpoints be unit-tested without touching Postgres |

### Acceptance Criteria
- [ ] Migration creates `monthly_obligations` with the columns above
- [ ] `UNIQUE (member_id, month, year)` constraint enforced at the database level
- [ ] `status` only accepts `UNPAID` or `PAID`
- [ ] `MonthlyObligation` domain entity implemented
- [ ] `monthly-obligation.repository.interface.ts` and `.mock.ts` exist
- [ ] `persistence/monthly-obligation.repository.ts` implements: create, find-by-member, find-by-member-and-period, list (filterable by member/status/period), mark-paid (used later by Sprint 5's approval flow)

### Dependencies
IKM-2.1 (`members` table), IKM-3.1 (settings values to snapshot)

### Out of Scope
The generation job itself (IKM-4.2), any endpoint (IKM-4.3, IKM-4.4),
marking an obligation `PAID` via a real approval flow (Sprint 5 calls into
this repository — the wiring belongs there, not here)

### Code Quality
- [ ] `expected_amount`, `due_day`, and `currency` are never re-derived from `system_settings` after an obligation is created — the obligation row is the sole source of truth for its own period, forever

---

## IKM-4.2 — Monthly obligation generation scheduler

### Goal
An obligation has to actually be created before anyone can miss it, pay
it, or be penalized for it. This ticket is what turns "every active member
owes a monthly share" from a business rule in the README into rows in the
database.

### Description
Implement a `@nestjs/schedule` cron job (Africa/Kigali) that, once per
period, creates a `MonthlyObligation` for every `ACTIVE` member for the
current month/year — unless one already exists — snapshotting the current
`SystemSettings` values onto each new row. Includes building the
`time-provider` abstraction this job (and Sprint 6's penalty scheduler)
depends on.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `application/time-provider.interface.ts` + `.ts` + `.mock.ts` (injectable clock) | Lets this job's due-date/period logic be unit-tested against an arbitrary "current date" instead of waiting on the real clock or mocking global `Date` — also required by Sprint 6's penalty scheduler later |
| Cron scheduled once per period (e.g. `00:05` on the 1st, `Africa/Kigali`) | Aligns obligation creation with the start of the billing month, giving members the full month to pay before `due_day` |
| Only members whose linked `User.status === ACTIVE` receive a new obligation | Consistent with Sprint 2's unified status decision — suspended or exited members should not accrue new obligations |
| Skip members whose `joined_date` is after the period being generated | No pro-rated obligations — README §3's "full months only" rule means a member who joins mid-month gets their first obligation next period, not a partial one this period |
| Reads `SystemSettings.getCurrent()` once per run; snapshots `monthlyShareAmount` / `dueDay` / `currency` onto each new row | This is the mechanism, not just the schema (IKM-4.1), that implements "historical values are immutable" |
| Skip any member who already has an obligation for `(member_id, month, year)` before inserting | Idempotency at the application level, backed by IKM-4.1's unique constraint as a hard backstop — running the job twice in the same period is always safe |
| One member's failure doesn't abort the whole batch | A single bad row (e.g. an unexpected constraint violation) shouldn't prevent every other active member from getting their obligation that period |

### Acceptance Criteria
- [ ] Cron job runs once per period on schedule, `Africa/Kigali` timezone
- [ ] Running the job twice for the same period produces zero duplicate obligations
- [ ] Only `ACTIVE` members (via linked user) receive new obligations
- [ ] Members whose `joined_date` is after the period start are skipped, not given a partial obligation
- [ ] New obligations snapshot the `SystemSettings` values in effect at the moment the job ran
- [ ] All date logic goes through `TimeProvider` — no direct `new Date()` / `Date.now()` call in the job or the service it calls
- [ ] A failure generating one member's obligation is logged and does not stop the rest of the batch from completing
- [ ] Unit tests use the `TimeProvider` mock and `SystemSettings` mock — no real clock or database dependency

### Dependencies
IKM-4.1, IKM-3.1, IKM-2.1

### Out of Scope
Penalty generation (Sprint 6 — a separate daily scheduler that reads
`MonthlyObligation`, it does not live here), any pro-ration logic for
mid-month joiners, an Admin-triggered manual re-run endpoint (flag if
Admins need to force a run outside the schedule)

### Code Quality
- [ ] Period/due-date calculation logic is a shared helper, not duplicated here and again in Sprint 6's penalty scheduler

---

## IKM-4.3 — `GET /monthly-obligations` (Admin queries obligations)

### User Story
As an Admin, I want to query obligations by member, status, or period, so
that I can see who has paid, who hasn't, and who's missing months.

### Description
Implement `GET /monthly-obligations` with filtering and an `isOverdue`
computed flag (not a stored column — it's derived from `status`, `due_day`,
`month`, `year`, and the current date via `TimeProvider`).

### API Endpoint
`GET /api/v1/monthly-obligations`

### Query Parameters
- `memberId` (optional)
- `status` (optional — `UNPAID` / `PAID`)
- `month`, `year` (optional — filter to a specific period)
- `overdue` (optional boolean — when `true`, returns only `UNPAID` obligations whose due date has passed)
- `page`, `limit` (pagination, default `1`/`20`, `limit` capped at `100`)

### Successful Response
Status: `200 OK`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "memberId": "...",
        "month": 8,
        "year": 2026,
        "expectedAmount": 20000,
        "currency": "RWF",
        "dueDay": 7,
        "status": "UNPAID",
        "isOverdue": true
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 5
  },
  "message": "Obligations retrieved"
}
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | List returned (possibly empty) |
| 400 | Invalid query parameters |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Input Validation
- `status`: must be `UNPAID` or `PAID` if present
- `month`: `1–12` if present; `year`: reasonable 4-digit year if present
- `overdue`: boolean if present
- `page`, `limit`: positive integers, `limit` capped at 100

### Acceptance Criteria

**Endpoint**
- [ ] Returns paginated, filtered obligations with `isOverdue` computed per row
- [ ] `overdue=true` returns only `UNPAID` obligations past their due date, computed via `TimeProvider`, not a stored flag

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Invalid `status`, `month`, or out-of-range `limit` returns `400`

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/500

**Automated Tests**
- [ ] Unit tests: filter by member, status, period, overdue flag computed correctly at a boundary (due day today vs. due day passed)
- [ ] Integration test against a seeded test database

**Code Quality**
- [ ] `isOverdue` computation reuses the same due-date logic as IKM-4.2, not a re-implementation

### Dependencies
IKM-4.1, IKM-1.2, IKM-1.4

### Out of Scope
Penalty amounts (Sprint 6 owns those), generating obligations from this
endpoint (read-only)

---

## IKM-4.4 — `GET /monthly-obligations/me` (Member views own obligations)

### User Story
As a logged-in Member, I want to see my own monthly obligations — paid,
unpaid, and overdue — so that I know what I owe and what months I've
missed.

### API Endpoint
`GET /api/v1/monthly-obligations/me`

### Query Parameters
- `status` (optional — `UNPAID` / `PAID`)
- `year` (optional)
- `overdue` (optional boolean, same meaning as IKM-4.3)

### Successful Response
Status: `200 OK` — same item shape as IKM-4.3, scoped to the caller's own
obligations, no pagination envelope required (a single member's yearly
obligation count is small — flag if pagination turns out to be needed).

### Possible Responses
| Status | Description |
|---|---|
| 200 | Own obligations returned |
| 401 | No valid access token |
| 404 | Authenticated user has no linked `Member` record |
| 500 | Unexpected application error |

### Authorization
`@UseGuards(JwtAuthGuard)`, `@Roles(Role.MEMBER)`

### Flow
1. Authenticate, get `userId` from `@CurrentUser()`
2. Resolve `Member` by `user_id` (404 if none)
3. Query obligations for that `member_id` with the given filters
4. Compute `isOverdue` per row, same logic as IKM-4.3
5. Return the list

### Acceptance Criteria

**Endpoint**
- [ ] Returns only the authenticated member's own obligations
- [ ] `isOverdue` computed identically to IKM-4.3

**Authorization**
- [ ] Unauthenticated request returns `401`
- [ ] No `:id`/`memberId` param exists — a member cannot view another member's obligations through this endpoint by construction
- [ ] Non-`MEMBER` roles rejected

**API Documentation**
- [ ] Documented in Swagger with 200/401/404/500

**Automated Tests**
- [ ] Unit tests: filtered list, no linked member record
- [ ] Integration test using the `JwtAuthGuard` mock

**Code Quality**
- [ ] Shares the overdue-computation helper with IKM-4.3 rather than duplicating it

### Dependencies
IKM-4.1, IKM-1.4, IKM-2.1

### Out of Scope
Any write operation — this is read-only, same as IKM-4.3