# Sprint 2 — Members

Two ticket templates are used, same as Sprint 1:
- **Setup Ticket** (IKM-2.1) — foundational piece with no HTTP endpoint of
  its own; every other ticket in this sprint depends on it.
- **API Story Ticket** (IKM-2.2 – IKM-2.8) — User Story, Endpoint, Request,
  Response, Authorization, Validation, grouped Acceptance Criteria,
  Dependencies, Out of Scope.

**Design decision carried through this whole sprint (revised):** `User`
(Sprint 1) is the authentication identity; `Member` is the Ikimina
membership record (README §3). A `Member` always has exactly one linked
`User`. There is **one status, not two** — membership state *is*
`User.status` (`ACTIVE` / `SUSPENDED` / `EXITED`). `members` carries no
`status` column of its own, so there is nothing to keep in sync and no way
for the two to disagree. This does mean `IKM-1.1` and `IKM-1.3` from
Sprint 1 need a small amendment — see the note under IKM-2.1.

---

## IKM-2.1 — Member schema, domain entity & repository

### Goal
Every remaining ticket in this sprint (and every future ticket that
references "the member" — contributions, penalties, dashboards, reports)
needs a `Member` entity and a tested way to read/write it. This ticket is
that floor, the same role IKM-1.1 played for `User`.

### Description
Create the `members` table migration, the `Member` domain entity, a
member-number generator, and the repository interface/mock pair. Status
lives entirely on `users.status` — see the amendment note below.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `members` migration: `id`, `user_id` (FK → `users.id`, unique), `member_number` (unique), `full_name`, `national_id` (nullable), `address` (nullable), `joined_date`, `created_at` | `user_id` is unique because a `User` maps to at most one `Member` — this enforces the identity/membership split at the schema level. No `status` column here — see amendment note |
| FK `user_id → users.id`, `ON DELETE RESTRICT` | A `Member` must never outlive its `User` silently; deleting a `User` with an active `Member` record should fail loudly, not cascade-delete financial history |
| `member_number` generated sequentially (e.g. `IKM-0001`) | Every future report/statement (Sprint 10, 11) displays this as the human-facing identifier — it must be stable and never reused |
| `application/member/member.ts` domain entity, includes the linked `User.status` when hydrated (not stored on `Member` itself) | Typed representation used by every controller/service in this sprint, without duplicating status |
| `member.repository.interface.ts` + `.mock.ts` | Lets IKM-2.2 through IKM-2.8 be unit-tested without touching Postgres |

### Amendment to Sprint 1 (apply before/alongside this ticket)
- **IKM-1.1**: `users.status` is the single enum used everywhere: `ACTIVE`,
  `SUSPENDED`, `EXITED` (replaces the earlier informal `SUSPENDED` /
  `INACTIVE` wording — `EXITED` now covers "member left the Ikimina" and
  `SUSPENDED` covers "temporarily blocked").
- **IKM-1.3** (`POST /auth/login`): the account-status check becomes "deny
  with 403 if `status !== ACTIVE`" rather than enumerating `SUSPENDED` /
  `INACTIVE` specifically — this way `EXITED` is blocked too, with no
  separate case needed.

### Acceptance Criteria
- [ ] Migration creates `members` table with the columns above — no `status` column; `migrate up`/`migrate down` both verified
- [ ] `user_id` has a unique constraint and FK to `users.id`
- [ ] `member_number` generation is race-safe (two concurrent creates never produce the same number)
- [ ] `Member` domain entity implemented in `application/member/member.ts`; any "status" shown to callers is read from the joined `User`, never stored redundantly
- [ ] `member.repository.interface.ts` and `.mock.ts` exist
- [ ] `persistence/member.repository.ts` implements create / find-by-id (joined with user) / find-by-user-id / find-by-member-number / list (with filter+pagination, joined with user for status/email/phone) / update

### Dependencies
IKM-1.1 (`users` table must exist to FK against), IKM-0.3 (migrations tooling)

### Out of Scope
Any endpoint — those are IKM-2.2 through IKM-2.8

### Code Quality
- [ ] No repository method accepts raw SQL fragments from the caller (filters are typed parameters, not string-built)
- [ ] No code path writes a "member status" anywhere other than through `users.status`

---

## IKM-2.2 — `POST /members` (Admin creates a member)

### User Story
As an Admin, I want to create a new member — including their login
account — so that a person can join the Ikimina and start using the
platform under their own credentials.

### Description
Implement `POST /members`. This is the only entry point that creates a
`User` and a `Member` together: the Admin never sets a password directly —
the system generates one, emails it to the new member, and never returns
it in the API response.

### API Endpoint
`POST /api/v1/members`

### Request Body
`CreateMemberDTO`:
- `email` (string, required, valid email)
- `phone` (string, required)
- `fullName` (string, required)
- `nationalId` (string, optional)
- `address` (string, optional)
- `joinedDate` (date, optional — defaults to today)

### Successful Response
Status: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "memberNumber": "IKM-0001",
    "fullName": "...",
    "email": "...",
    "phone": "...",
    "status": "ACTIVE",
    "joinedDate": "2026-09-07"
  },
  "message": "Member created successfully"
}
```
`status` here is the linked user's status (always `ACTIVE` at creation
time). The response must never include a password, temp password, or
password hash.

### Possible Responses
| Status | Description |
|---|---|
| 201 | Member (and linked user) created |
| 400 | `CreateMemberDTO` missing/malformed |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 409 | Email or phone already registered to an existing user |
| 500 | Unexpected application error (including mail delivery failure — see Important) |

### Authorization
`@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(Role.ADMIN)`

### Input Validation
- `email`: required, valid format, unique against `users.email`
- `phone`: required, unique against `users.phone`
- `fullName`: required, non-empty
- `nationalId`, `address`: optional strings
- `joinedDate`: optional, valid date, not in the future
- Reject any additional/unexpected fields

### Important
Decide the failure mode if member/user creation succeeds but the temp
password email fails to send: **the member record is still created** (the
Admin can resolve credentials later — not building "resend" in this
ticket, flag if needed sooner). Do not roll back a successful DB write just
because SMTP failed, and do not silently swallow the mail error — return
`201` but log the mail failure for the Admin to notice.

### Creation Flow
1. Validate `CreateMemberDTO`
2. Check `email` and `phone` are not already registered (409 if so)
3. Generate a temporary password; hash it (IKM-1.1 hashing utility)
4. Create `User` with `role = MEMBER`, `status = ACTIVE`
5. Generate the next `member_number`; create `Member` linked to that `User`
6. Send the temporary password to `email` via the `mail` adapter (IKM-0.5)
7. Return the member summary — never the password

### Acceptance Criteria

**Endpoint**
- [ ] `POST /members` creates both `User` and `Member`, returns `201` with the documented shape

**Authorization**
- [ ] Non-Admin (including unauthenticated) requests are rejected (401/403)

**Validation**
- [ ] Duplicate email or phone returns `409`
- [ ] Missing/malformed fields return `400`

**Security**
- [ ] Response never includes password, temp password, or password hash
- [ ] Temp password is generated with sufficient entropy and hashed before storage

**API Documentation**
- [ ] Documented in Swagger with 201/400/401/403/409/500

**Automated Tests**
- [ ] Unit tests: happy path, duplicate email, duplicate phone, mail-send failure still returns 201
- [ ] Integration test: full creation flow against a test database, using the mail mock

**Code Quality**
- [ ] No linting errors
- [ ] Follows DTO/naming conventions in README §6

### Dependencies
IKM-2.1, IKM-1.1, IKM-1.2, IKM-0.5 (mail adapter)

### Out of Scope
Forced password change on first login (flag as a follow-up if required),
bulk/CSV member import, resending temp password

---

## IKM-2.3 — `GET /members` (Admin lists members)

### User Story
As an Admin, I want to list and search members, so that I can find and
manage the people in the Ikimina.

### Description
Implement `GET /members` with pagination, status filtering, and
name/email/member-number search. `status` here filters on the joined
`User.status`.

### API Endpoint
`GET /api/v1/members`

### Query Parameters
- `status` (optional — `ACTIVE` / `SUSPENDED` / `EXITED`)
- `search` (optional — matches against `fullName`, `email`, `memberNumber`)
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

### Successful Response
Status: `200 OK`
```json
{
  "success": true,
  "data": {
    "items": [ { "id": "...", "memberNumber": "IKM-0001", "fullName": "...", "status": "ACTIVE" } ],
    "page": 1,
    "limit": 20,
    "total": 42
  },
  "message": "Members retrieved"
}
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | List returned (possibly empty) |
| 400 | Invalid query parameters (e.g. `limit` > 100, malformed `status`) |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Input Validation
- `status`: must be one of `ACTIVE` / `SUSPENDED` / `EXITED` if present
- `page`, `limit`: positive integers; `limit` capped at 100
- `search`: free-text, sanitized, no raw SQL passthrough

### Acceptance Criteria

**Endpoint**
- [ ] Returns paginated list matching filters
- [ ] Empty result set returns `200` with an empty `items` array, not `404`

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Invalid `status` or out-of-range `limit` returns `400`

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/500

**Automated Tests**
- [ ] Unit tests: filter by status, search match, pagination boundaries
- [ ] Integration test against a seeded test database

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-2.1

### Out of Scope
Sorting options beyond a sensible default (e.g. `member_number` ascending) —
flag if custom sort is needed

---

## IKM-2.4 — `GET /members/:id` (Admin gets a single member)

### User Story
As an Admin, I want to view a single member's full detail, so that I can
review or act on their record.

### API Endpoint
`GET /api/v1/members/:id`

### Successful Response
Status: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "memberNumber": "IKM-0001",
    "fullName": "...",
    "nationalId": "...",
    "address": "...",
    "email": "...",
    "phone": "...",
    "status": "ACTIVE",
    "joinedDate": "2026-01-15"
  },
  "message": "Member retrieved"
}
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Member found |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 404 | No member with that `id` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Acceptance Criteria

**Endpoint**
- [ ] Returns full member detail (member fields + linked user's email/phone/status) for a valid `id`
- [ ] Unknown `id` returns `404` via the shared `not-found.exception-filter.ts` (IKM-0.6)

**Authorization**
- [ ] Non-Admin requests rejected

**API Documentation**
- [ ] Documented in Swagger with 200/401/403/404/500

**Automated Tests**
- [ ] Unit tests: found, not found
- [ ] Integration test against a test database

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-2.1

### Out of Scope
Embedding transaction/contribution history in this response — that's
`GET /transactions` (Sprint 8) filtered by member

---

## IKM-2.5 — `PATCH /members/:id` (Admin updates a member)

### User Story
As an Admin, I want to correct or update a member's details, so that
records stay accurate over time.

### API Endpoint
`PATCH /api/v1/members/:id`

### Request Body
`UpdateMemberDTO` (all fields optional, at least one required):
- `fullName`
- `phone`
- `address`
- `nationalId`

### Successful Response
Status: `200 OK` — returns the updated member (same shape as IKM-2.4).

### Possible Responses
| Status | Description |
|---|---|
| 200 | Member updated |
| 400 | Empty body, or malformed field |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 404 | No member with that `id` |
| 409 | New `phone` collides with another user's phone |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Input Validation
- At least one field required
- `phone` uniqueness re-checked against `users.phone` (excluding this member's own linked user) if changed
- Reject any additional/unexpected fields, including attempts to change `email`, `status`, or `memberNumber` through this endpoint

### Important
`email` is intentionally **not** editable here or anywhere else in this
sprint — flagged as a future ticket if needed, since it likely needs its
own re-verification flow. `status` changes go through IKM-2.6 only.

### Acceptance Criteria

**Endpoint**
- [ ] Updates only the allowed fields and returns the updated record

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Empty body returns `400`
- [ ] Attempting to set `email`/`status`/`memberNumber` is ignored or rejected (400), never silently applied
- [ ] Phone collision returns `409`
- [ ] Unknown `id` returns `404`

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/404/409/500

**Automated Tests**
- [ ] Unit tests: successful update, phone collision, not found, disallowed field ignored/rejected

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-2.1

### Out of Scope
Email change flow, status change (IKM-2.6)

---

## IKM-2.6 — `PATCH /members/:id/status` (Admin suspends/activates/exits a member)

### User Story
As an Admin, I want to suspend, reactivate, or mark a member as exited, so
that membership state reflects reality and suspended members lose access.

### Description
This is the **only** endpoint allowed to change a member's status. Because
status lives solely on `users.status` (see IKM-2.1's amendment note), this
is a single write — there is no second record to keep in sync. Setting
`SUSPENDED` or `EXITED` blocks login immediately, since `POST /auth/login`
(IKM-1.3, amended) denies any status other than `ACTIVE`.

### API Endpoint
`PATCH /api/v1/members/:id/status`

### Request Body
`UpdateMemberStatusDTO`:
- `status` (required — `ACTIVE` / `SUSPENDED` / `EXITED`)
- `reason` (string, required when `status` is `SUSPENDED` or `EXITED`)

### Successful Response
Status: `200 OK`
```json
{ "success": true, "data": { "id": "...", "status": "SUSPENDED" }, "message": "Member status updated" }
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Status updated |
| 400 | Invalid `status` value, or missing `reason` for a suspend/exit |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 404 | No member with that `id` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Input Validation
- `status`: must be a valid status value
- `reason`: required, non-empty, when transitioning to `SUSPENDED` or `EXITED`; optional when reactivating to `ACTIVE`

### Status Change Flow
1. Validate DTO
2. Load member by `id`, resolve linked `user_id` (404 if member not found)
3. Update `users.status` for that `user_id`
4. Return the new status

### Important
This ticket writes the state change only. It does **not** create an
`AuditLog` entry — `AuditLog` doesn't exist until Sprint 13. Flag this as
an integration point Sprint 13 must retrofit (every state-changing Admin
action, including this one, is required by README §2/Sprint 13 to be
audit-logged).

### Acceptance Criteria

**Endpoint**
- [ ] Suspending, reactivating, and exiting a member each update `users.status` correctly
- [ ] A suspended/exited member's existing access token still works until it expires unless IKM-1.6's revocation applies — no new mechanism introduced here

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Missing `reason` on suspend/exit returns `400`
- [ ] Invalid `status` value returns `400`
- [ ] Unknown `id` returns `404`

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/404/500

**Automated Tests**
- [ ] Unit tests: suspend, reactivate, exit, missing reason, not found

**Code Quality**
- [ ] No linting errors
- [ ] Status is written in exactly one place (`users.status`) — no duplicate field anywhere

### Dependencies
IKM-2.1, IKM-1.1, IKM-1.3 (amended)

### Out of Scope
Audit log write (Sprint 13 retrofits this), notifying the member that they were suspended (Sprint 12), forcibly revoking an already-issued access token on suspend (flag if immediate revocation is required — currently the token remains valid until natural expiry, consistent with IKM-1.6's stated default)

---

## IKM-2.7 — `GET /members/me` (Member views own profile)

### User Story
As a logged-in Member, I want to view my own profile, so that I can
confirm my details are correct without needing Admin access.

### API Endpoint
`GET /api/v1/members/me`

### Successful Response
Status: `200 OK` — same shape as IKM-2.4's response, for the caller's own record.

### Possible Responses
| Status | Description |
|---|---|
| 200 | Own member profile returned |
| 401 | No valid access token |
| 404 | Authenticated user has no linked `Member` record (e.g. an `ADMIN`-only account) |
| 500 | Unexpected application error |

### Authorization
`@UseGuards(JwtAuthGuard)`, restricted to `Role.MEMBER` via `@Roles(Role.MEMBER)` — an Admin account with no member record calling this endpoint isn't the intended use case and should be blocked at the role check, not fall through to a confusing 404.

### Profile Flow
1. Authenticate request (`JwtAuthGuard`), get `userId` from `@CurrentUser()`
2. Look up `Member` by `user_id`, joined with the user's `status`/`email`/`phone`
3. If not found → `404`
4. Return the member's own profile

### Acceptance Criteria

**Endpoint**
- [ ] Returns the authenticated member's own profile, never another member's

**Authorization**
- [ ] Unauthenticated request returns `401`
- [ ] A `Member` can never retrieve another member's data through this endpoint (there is no `:id` param — this is enforced by construction, not by a check)
- [ ] Non-`MEMBER` roles are rejected by `@Roles(Role.MEMBER)`

**API Documentation**
- [ ] Documented in Swagger with 200/401/404/500

**Automated Tests**
- [ ] Unit tests: found, no linked member record
- [ ] Integration test using the `JwtAuthGuard` mock (IKM-1.4) to simulate an authenticated member

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-2.1, IKM-1.4

### Out of Scope
Editing (IKM-2.8 covers that)

---

## IKM-2.8 — `PATCH /members/me` (Member updates own profile)

### User Story
As a logged-in Member, I want to update my own contact details, so that my
profile stays accurate without needing to ask an Admin for every small
change.

### Description
Self-service counterpart to IKM-2.5 — same allowed-field restriction
(email and status are never editable here), but scoped to the caller's own
record with no `:id` param, so a member can never target another member's
record even by mistake.

### API Endpoint
`PATCH /api/v1/members/me`

### Request Body
`UpdateOwnProfileDTO` (all fields optional, at least one required):
- `fullName`
- `phone`
- `address`

`nationalId` is intentionally excluded from self-service editing — treated
as an identity-verification field an Admin should control. Flag if members
should be able to self-edit this too.

### Successful Response
Status: `200 OK` — returns the updated profile (same shape as IKM-2.7).

### Possible Responses
| Status | Description |
|---|---|
| 200 | Profile updated |
| 400 | Empty body, or malformed field |
| 401 | No valid access token |
| 404 | Authenticated user has no linked `Member` record |
| 409 | New `phone` collides with another user's phone |
| 500 | Unexpected application error |

### Authorization
`@UseGuards(JwtAuthGuard)`, `@Roles(Role.MEMBER)`

### Input Validation
- At least one field required
- `phone` uniqueness re-checked against `users.phone` (excluding the caller's own user), if changed
- Reject any additional/unexpected fields, in particular `email`, `status`, `memberNumber`, `nationalId`

### Acceptance Criteria

**Endpoint**
- [ ] Updates only `fullName` / `phone` / `address` on the caller's own record

**Authorization**
- [ ] Unauthenticated request returns `401`
- [ ] A member can only ever update their own record — enforced by construction (no `:id` param), not by an ownership check that could be bypassed
- [ ] Non-`MEMBER` roles rejected

**Validation**
- [ ] Empty body returns `400`
- [ ] `email`/`status`/`memberNumber`/`nationalId` in the body is ignored or rejected (400), never silently applied
- [ ] Phone collision returns `409`

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/404/409/500

**Automated Tests**
- [ ] Unit tests: successful update, phone collision, disallowed field ignored/rejected, no linked member record

**Code Quality**
- [ ] No linting errors
- [ ] Shares validation logic with IKM-2.5 where possible rather than duplicating the DTO rules

### Dependencies
IKM-2.1, IKM-1.4

### Out of Scope
Email change flow, self-service status change (not possible — status is Admin-only via IKM-2.6)