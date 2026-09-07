# Sprint 3 — System Settings

One ticket template used throughout: IKM-3.1 is a **Setup Ticket**;
IKM-3.2 and IKM-3.3 are **API Story Tickets**, same structure as Sprint 1/2.

**Design decision:** `system_settings` is a **singleton** — exactly one row
ever exists, for the one Ikimina this system manages. Settings are not
versioned as a table; instead, per README §3's immutability rule, every
`MonthlyObligation` (Sprint 4) copies the values it needs at the moment
it's created. Changing settings here only affects obligations generated
*after* the change.

---

## IKM-3.1 — System settings schema, entity & repository

### Goal
Every obligation generated from Sprint 4 onward, and every penalty
calculated from Sprint 6 onward, needs one authoritative place to read the
current monthly share amount, penalty rate, due day, and currency. This
ticket is that place.

### Description
Create the `system_settings` table as an enforced singleton, seed it with
an initial row, and build the domain entity and repository
interface/mock pair.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `system_settings` migration: `id`, `monthly_share_amount` (numeric), `penalty_percentage` (numeric), `due_day` (smallint), `currency` (varchar(3)), `updated_at`, `updated_by` (nullable FK → `users.id`) | These four business values anchor every financial calculation in Sprints 4–8; `updated_by`/`updated_at` give cheap traceability now, ahead of full audit logging in Sprint 13 |
| Constraint enforcing exactly one row (e.g. `CHECK (id = 1)`) | The system models a single Ikimina — a second settings row would be meaningless and dangerous (which one applies?) |
| Seed migration inserting the initial default row | The app cannot boot into a usable state with zero settings rows — Sprint 4's obligation generator would have nothing to read |
| `application/system-settings/system-settings.ts` domain entity | Typed representation for every service that reads or writes settings |
| `system-settings.repository.interface.ts` + `.mock.ts` with `getCurrent()` / `update()` | Lets Sprint 4's obligation generator and this sprint's own endpoints be unit-tested without touching Postgres |

### Acceptance Criteria
- [ ] Migration creates `system_settings` with a constraint guaranteeing exactly one row can ever exist
- [ ] Seed migration inserts one default row with `due_day = 7` (confirmed — the 7th exists in every month, including February in both common and leap years); `monthly_share_amount`, `penalty_percentage`, and `currency` remain placeholders — confirm those with the product owner before this goes live
- [ ] `SystemSettings` domain entity implemented
- [ ] `system-settings.repository.interface.ts` and `.mock.ts` exist
- [ ] `persistence/system-settings.repository.ts` implements `getCurrent()` and `update()`

### Dependencies
IKM-0.3 (migrations tooling), IKM-1.1 (`users.id` for `updated_by`)

### Out of Scope
Any endpoint (IKM-3.2, IKM-3.3), any obligation/penalty logic (Sprint 4, 6)

### Code Quality
- [ ] No `application/<feature>` service anywhere in the project reads `system_settings` via raw SQL — always through this repository interface

---

## IKM-3.2 — `GET /system-settings` (Admin views current settings)

### User Story
As an Admin, I want to see the current system settings, so that I know
what's configured before deciding whether to change it.

### API Endpoint
`GET /api/v1/system-settings`

### Successful Response
Status: `200 OK`
```json
{
  "success": true,
  "data": {
    "monthlyShareAmount": 20000,
    "penaltyPercentage": 10,
    "dueDay": 7,
    "currency": "RWF",
    "updatedAt": "2026-01-15T08:00:00Z"
  },
  "message": "Settings retrieved"
}
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Settings returned |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Acceptance Criteria

**Endpoint**
- [ ] Returns the single current settings row

**Authorization**
- [ ] Non-Admin requests rejected

**API Documentation**
- [ ] Documented in Swagger with 200/401/403/500

**Automated Tests**
- [ ] Unit test: returns current settings
- [ ] Integration test against a seeded test database

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-3.1, IKM-1.2, IKM-1.4

### Out of Scope
History of previous settings values — only the current row is stored;
flag if a change-history view is needed before Sprint 13's audit log
exists

---

## IKM-3.3 — `PATCH /system-settings` (Admin updates settings)

### User Story
As an Admin, I want to update the monthly share amount, penalty rate, due
day, or currency, so that the system reflects the Ikimina's current rules.

### Description
Implement `PATCH /system-settings`. This updates the single settings row
going forward only — it must never touch any `MonthlyObligation` already
created, per README §3's immutability rule.

### API Endpoint
`PATCH /api/v1/system-settings`

### Request Body
`UpdateSystemSettingsDTO` (all optional, at least one required):
- `monthlyShareAmount` (number, > 0)
- `penaltyPercentage` (number, 0–100)
- `dueDay` (integer, 1–28)
- `currency` (string, ISO 4217 3-letter code)

### Successful Response
Status: `200 OK` — returns the updated settings (same shape as IKM-3.2).

### Possible Responses
| Status | Description |
|---|---|
| 200 | Settings updated |
| 400 | Empty body, or any field out of its valid range |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Input Validation
- At least one field required
- `monthlyShareAmount`: numeric, strictly greater than 0
- `penaltyPercentage`: numeric, `0 ≤ x ≤ 100`
- `dueDay`: integer, `1 ≤ x ≤ 28` — capped at 28 (not 31) so the due day is guaranteed to exist in every month, including February
- `currency`: exactly 3 letters, uppercase ISO 4217 style
- Reject any additional/unexpected fields

### Important
**This never rewrites existing obligations.** `MonthlyObligation` rows
(Sprint 4) snapshot `monthlyShareAmount`, `dueDay`, and `currency` at the
moment they're created — changing settings here only affects obligations
generated in future periods. Do not implement, and do not be asked to
implement, any retroactive recalculation.

### Update Flow
1. Validate `UpdateSystemSettingsDTO`
2. Load the current (singleton) settings row
3. Apply only the provided fields
4. Set `updated_by` to the calling Admin's `userId`, `updated_at` to now
5. Save and return the updated settings

### Acceptance Criteria

**Endpoint**
- [ ] Updates only the provided fields; unspecified fields keep their current value
- [ ] `updated_by` and `updated_at` are set on every successful update

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Empty body returns `400`
- [ ] `dueDay` outside `1–28` returns `400`
- [ ] `penaltyPercentage` outside `0–100` returns `400`
- [ ] `monthlyShareAmount ≤ 0` returns `400`
- [ ] Malformed `currency` returns `400`

**Business Rule**
- [ ] No existing `MonthlyObligation` row is modified as a side effect of this endpoint (verified once Sprint 4 exists — flag this test as a cross-sprint integration check)

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/500

**Automated Tests**
- [ ] Unit tests: successful partial update, each validation boundary, `updated_by`/`updated_at` set correctly

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-3.1

### Out of Scope
Retroactive recalculation of existing obligations (explicitly forbidden by
design), a full audit-log entry (Sprint 13 retrofits this — `updated_by`/
`updated_at` give minimal traceability in the meantime)