# Sprint 1 — Authentication & Role-Based Access Control

Two ticket templates are used in this sprint:
- **Setup Ticket** (IKM-1.1, IKM-1.2, IKM-1.4) — foundational pieces with no
  single HTTP endpoint of their own; every later Authorization section in
  every future ticket in this project depends on them.
- **API Story Ticket** (IKM-1.3, IKM-1.5, IKM-1.6, IKM-1.7) — same structure
  as the reference `RolesAndRightsModule2` example: User Story, Endpoint,
  Request, Response, Authorization, Validation, grouped Acceptance
  Criteria, Dependencies, Out of Scope.

**Status model (amended):** `users.status` is the single, unified status
used for both authentication gating and Ikimina membership state — see
IKM-1.1. There is no separate `authentication_status` column, and no
Sprint 2 `Member.status` either (Sprint 2 reads membership state from this
same column via the linked user).

---

## IKM-1.1 — User schema & password hashing

### Goal
Every feature in this system — login, member creation, approvals — needs a
`User` identity to exist first. This ticket is the floor everything else
stands on.

### Description
Create the `users` table migration and the `User` domain entity, plus a
password hashing utility used by every future ticket that creates or
verifies a password.

### Status Model
`users.status` is constrained to exactly three values, used as the single
source of truth for both authentication gating and Ikimina membership
state — there is no separate authentication-status column, and Sprint 2's
`Member` never stores its own status:

| Status | Authentication | Membership meaning |
|---|---|---|
| `ACTIVE` | Allowed | Active Ikimina member |
| `SUSPENDED` | Blocked | Temporarily suspended |
| `EXITED` | Blocked | Member has left the Ikimina |

`ACTIVE` is the default status for a newly created user.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `users` migration: `id`, `email`, `phone`, `password_hash`, `role`, `status`, `joined_date`, `created_at` | Matches the User/Member split defined in README §7 — `User` is the authentication identity, `Member` (Sprint 2) is the Ikimina membership record |
| `status` constrained to `ACTIVE` / `SUSPENDED` / `EXITED` | This is the single field every future login check, `RolesGuard`, and Sprint 2 membership-status read all depend on — one column, one meaning, no drift between an "auth status" and a "membership status" |
| `role` column constrained to `MEMBER` / `ADMIN` | This is the column every future `RolesGuard` check reads — it must exist before any guard can be built |
| `application/authentication/user.ts` domain entity | Gives every future ticket (login, member creation) a typed representation instead of raw DB rows |
| Password hashing utility (bcrypt or argon2) behind an interface | Centralizes the one piece of security-critical code that must never be reimplemented per-feature; also makes it swappable/testable |
| `application/authentication/user.repository.interface.ts` + `.mock.ts` | Lets IKM-1.3 (login) and IKM-2.2 (member creation) be unit-tested without touching Postgres |

### Acceptance Criteria
- [ ] Migration creates `users` table with the columns above
- [ ] `status` only accepts `ACTIVE`, `SUSPENDED`, or `EXITED`; no other value is possible at the database level
- [ ] `ACTIVE` is the default status on creation
- [ ] No separate `authentication_status` or equivalent column exists anywhere
- [ ] `User` domain entity implemented in `application/authentication/user.ts`
- [ ] Password hashing utility hashes on write and verifies on read; raw passwords are never stored or logged
- [ ] `user.repository.interface.ts` and `.mock.ts` exist
- [ ] `persistence/user.repository.ts` implements create/find-by-email/find-by-id

### Dependencies
IKM-0.3 (database connection), IKM-0.2 (skeleton)

### Out of Scope
Login endpoint itself (IKM-1.3), member-specific fields (Sprint 2)

### Code Quality
- [ ] No plaintext password ever appears in a log statement or error message

---

## IKM-1.2 — Role-based access control: `Role` enum, `@Roles()` decorator, `RolesGuard`

*(This is this project's equivalent of the reference project's
"RolesAndRightsModule1" — every future ticket that restricts an endpoint to
Admin or Member depends on this ticket and must reuse it rather than
reimplementing role checks.)*

### Goal
Every feature ticket from Sprint 2 onward has an "Authorization" section
that says things like "Only Admin can access this." That statement needs
one shared, tested mechanism behind it — not a bespoke `if (user.role !==
'ADMIN')` check copy-pasted into every controller.

### Description
Implement the `Role` enum, the `@Roles()` decorator, and `RolesGuard`,
which together restrict controller routes to specific roles.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `Role` enum (`MEMBER`, `ADMIN`) defined once in `application/authentication/` | Single source of truth — every guard, decorator, and DTO that references a role imports this, rather than each file defining its own string literals |
| `@Roles(Role.ADMIN)` decorator | Lets a controller declare its required role directly above the route, keeping the authorization rule visible at the point of use |
| `RolesGuard` reading `request.user.role` (set by `JwtAuthGuard`, IKM-1.4) and comparing against `@Roles()` metadata | This is the actual enforcement mechanism — without it, `@Roles()` would just be a decorative comment |
| Applied as `@UseGuards(JwtAuthGuard, RolesGuard)` | Order matters: authentication must run before authorization, since `RolesGuard` needs `request.user` to already be populated |

### Acceptance Criteria
- [ ] `Role` enum exists and is imported everywhere a role is referenced (no duplicate string literals)
- [ ] `@Roles()` decorator attaches role metadata to a route handler
- [ ] `RolesGuard` denies access (403) when the authenticated user's role isn't in the required list
- [ ] `RolesGuard` allows access when the role matches
- [ ] Unit tests cover: correct role allowed, wrong role denied, missing `@Roles()` metadata (route has no restriction)

### Dependencies
IKM-1.1 (role must exist on `User`), IKM-1.4 (needs `request.user` populated by `JwtAuthGuard` — built in parallel/immediately after)

### Out of Scope
Any specific endpoint's authorization rule — this ticket delivers the
mechanism only; each feature ticket (starting with IKM-2.2) applies it

### Code Quality
- [ ] No controller checks `request.user.role` manually — always via `RolesGuard`

---

## IKM-1.3 — `POST /auth/login`

### User Story
As a registered user (Member or Admin), I want to log in with my email and
password, so that I can receive an access token and use the rest of the
API according to my role.

### Description
Implement `POST /auth/login`, which validates credentials against the
`users` table and returns a signed JWT access token (and refresh token) on
success.

### API Endpoint
`POST /api/v1/auth/login`
Authenticates a user and issues tokens.

### Request Body
`LoginDTO`:
- `email` (string, required, valid email format)
- `password` (string, required)

### Successful Response
Status: `200 OK`
Content-Type: `application/json`
Response Body:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "user": { "id": "...", "email": "...", "role": "MEMBER" }
  },
  "message": "Login successful"
}
```
The response must never include `password` or `passwordHash`.

### Possible Responses
| Status | Description |
|---|---|
| 200 | Login successful, tokens issued |
| 400 | `LoginDTO` is missing or malformed |
| 401 | Email/password combination is invalid |
| 403 | `status !== ACTIVE` (covers both `SUSPENDED` and `EXITED`) |
| 500 | Unexpected application error |

### Authorization
This endpoint is public (no prior authentication required) — it is how
authentication begins.

### Important
Do not reveal whether the failure was "email not found" vs. "wrong
password" — both cases return the same generic 401 message, to avoid
leaking which emails are registered.

**Status check rule (amended):** the check is exactly `status !== ACTIVE`
→ deny with 403. Do **not** write separate branches for `status ===
SUSPENDED` and `status === EXITED` — both are denied by the same single
condition, so `EXITED` (a member who has left) is blocked the same way
`SUSPENDED` is, with no extra branch needed.

### Input Validation
- `email`: required, must be a valid email format
- `password`: required, non-empty
- Reject any additional/unexpected fields on the request body

### Login Flow
1. Validate `LoginDTO`
2. Look up user by email via `UserRepositoryInterface`
3. If not found, or password doesn't match the stored hash → return 401 with the generic message
4. If found and password matches, but `status !== ACTIVE` → return 403
5. On success, sign an access token and a refresh token containing `sub`
   (user id) and `role`
6. Return tokens plus a minimal, non-sensitive user summary

### Acceptance Criteria

**Endpoint**
- [ ] `POST /auth/login` implemented and returns `200` with tokens on valid credentials
- [ ] Response is `application/json` and matches the documented shape

**Authorization**
- [ ] Endpoint is public — no guard blocks unauthenticated access to `/auth/login` itself

**Validation**
- [ ] Missing/malformed `email` or `password` returns 400
- [ ] Wrong password or unknown email returns 401 with an identical, generic message
- [ ] `SUSPENDED` account returns 403
- [ ] `EXITED` account returns 403
- [ ] The implementation contains no separate branch for `SUSPENDED` vs. `EXITED` — a single `status !== ACTIVE` check handles both

**Security**
- [ ] Response never includes `password` or `passwordHash`
- [ ] Password comparison uses the hashing utility from IKM-1.1 — no plaintext comparison

**API Documentation**
- [ ] `POST /auth/login` documented in Swagger, including 200/400/401/403/500 responses

**Automated Tests**
- [ ] Unit tests: valid login, wrong password, unknown email, suspended account, exited account
- [ ] Integration test: full login flow against a test database

**Code Quality**
- [ ] No linting errors or warnings
- [ ] Follows the naming/DTO conventions in README §6

### Dependencies
IKM-1.1 (User schema + password hashing)

### Out of Scope
Refresh token endpoint (IKM-1.5), logout (IKM-1.6), password reset (not
yet scheduled — flag if needed sooner)

---

## IKM-1.4 — JWT strategy, `JwtAuthGuard`, `@CurrentUser()` decorator

### Goal
IKM-1.3 issues a token; this ticket is what makes that token actually
protect routes. Every ticket from Sprint 2 onward that says "requires
authentication" depends on this existing first.

### Description
Implement the JWT validation strategy, `JwtAuthGuard`, and a
`@CurrentUser()` decorator that extracts the authenticated user from the
request.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| JWT strategy validating signature + expiry, extracting `sub`/`role` | This is what turns a bearer token into a trusted `request.user` object |
| `JwtAuthGuard` | Applied via `@UseGuards(JwtAuthGuard)` on any route requiring authentication — rejects requests with a missing/invalid/expired token as 401 |
| `@CurrentUser()` decorator | Lets a controller access the authenticated user (e.g. `@CurrentUser() user: AuthUser`) without manually reading `request.user` each time — consistent, testable, and matches the reference project's `current-user.decorator.ts` pattern |
| Colocated `authentication.guard.mock.ts` | Lets every future controller's integration test simulate an authenticated request without a real token exchange |

### Acceptance Criteria
- [ ] Valid token → request proceeds with `request.user` populated (`id`, `role`)
- [ ] Missing token → 401
- [ ] Expired or malformed token → 401
- [ ] `@CurrentUser()` returns the same data `JwtAuthGuard` attached to the request
- [ ] Guard mock available for other modules' integration tests

### Dependencies
IKM-1.1 (role must exist on the user), IKM-1.3 (token issuance must exist to validate against)

### Out of Scope
Role-based restriction (that's `RolesGuard`, IKM-1.2) — this ticket only
proves *who* is making the request, not *what* they're allowed to do

### Code Quality
- [ ] Token secret/expiry read from config (IKM-0.4), never hardcoded

---

## IKM-1.5 — `POST /auth/refresh`

### User Story
As a logged-in user, I want to exchange a valid refresh token for a new
access token, so that I don't have to re-enter my password every time my
access token expires.

### Description
Implement `POST /auth/refresh`, validating the refresh token and issuing a
new access token.

### API Endpoint
`POST /api/v1/auth/refresh`

### Request Body
`RefreshTokenDTO`:
- `refreshToken` (string, required)

### Successful Response
Status: `200 OK`
```json
{ "success": true, "data": { "accessToken": "string" }, "message": "Token refreshed" }
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | New access token issued |
| 400 | `RefreshTokenDTO` missing/malformed |
| 401 | Refresh token invalid, expired, or revoked, or user's `status !== ACTIVE` |
| 500 | Unexpected application error |

### Authorization
Public endpoint (the refresh token itself is the credential — no separate
Bearer access token is required to call this route).

### Input Validation
- `refreshToken`: required, non-empty string

### Refresh Flow
1. Validate `RefreshTokenDTO`
2. Verify refresh token signature and expiry
3. Confirm the user still exists and `status === ACTIVE` (same unified check as login — a suspended or exited user's refresh token stops working, not just their login)
4. Issue a new access token; refresh token itself is not rotated in this
   ticket (flag if rotation is required — see Out of Scope)

### Acceptance Criteria

**Endpoint**
- [ ] `POST /auth/refresh` returns a new access token for a valid refresh token

**Validation**
- [ ] Missing/malformed body returns 400
- [ ] Invalid/expired refresh token returns 401
- [ ] Suspended or exited user's refresh token returns 401

**Security**
- [ ] Response never includes the user's password/hash

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/500

**Automated Tests**
- [ ] Unit + integration tests for valid refresh, expired token, suspended user, exited user

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-1.3, IKM-1.4

### Out of Scope
Refresh token rotation/revocation list — flag as a follow-up if the
security requirements demand it later

---

## IKM-1.6 — `POST /auth/logout`

### User Story
As a logged-in user, I want to log out, so that my session is invalidated
and my tokens can no longer be used.

### Description
Implement `POST /auth/logout`. Since JWTs are stateless, this ticket must
decide and implement an actual invalidation mechanism — not just a
client-side "forget the token" no-op — otherwise this endpoint doesn't do
anything real.

### API Endpoint
`POST /api/v1/auth/logout`

### Request Body
None — the token to invalidate is read from the `Authorization` header.

### Successful Response
Status: `200 OK`
```json
{ "success": true, "data": null, "message": "Logged out successfully" }
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Logout successful |
| 401 | No valid access token supplied |
| 500 | Unexpected application error |

### Authorization
Requires a valid access token (`JwtAuthGuard`) — you can only log yourself out.

### Important
Decide and document the actual mechanism before implementing: either (a) a
short-lived token blocklist keyed by token id, checked in `JwtAuthGuard`,
or (b) refresh-token revocation only, accepting that a still-valid access
token remains usable until it naturally expires. Given access tokens
should be short-lived, option (b) is the simpler default — flag if this
project needs (a) instead.

### Logout Flow
1. Authenticate the request (`JwtAuthGuard`)
2. Revoke the associated refresh token (if using option (b) above)
3. Return success

### Acceptance Criteria

**Endpoint**
- [ ] `POST /auth/logout` returns 200 for an authenticated request

**Authorization**
- [ ] Unauthenticated request returns 401
- [ ] A user cannot log out another user's session

**API Documentation**
- [ ] Documented in Swagger with 200/401/500

**Automated Tests**
- [ ] Integration test: authenticated logout succeeds; refresh token is unusable afterward (if revocation implemented); unauthenticated logout returns 401

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-1.4, IKM-1.5 (revocation target)

### Out of Scope
"Logout from all devices" / multi-session management — single active
session assumed unless told otherwise

---

## IKM-1.7 — `PATCH /auth/password` (self-service password change)

### User Story
As a logged-in user (Member or Admin), I want to change my own password,
so that I can move off a temporary or old password without needing an
Admin to do it for me. This is a password *change*, not a password reset —
the caller must prove they already know the current password.

### API Endpoint
`PATCH /api/v1/auth/password`

### Request Body
`ChangePasswordDTO`:
- `currentPassword` (string, required)
- `newPassword` (string, required)

### Successful Response
Status: `200 OK`
```json
{ "success": true, "data": null, "message": "Password updated successfully" }
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Password changed successfully |
| 400 | Missing/invalid fields, weak `newPassword`, or `newPassword === currentPassword` |
| 401 | No valid access token, or `currentPassword` doesn't match |
| 500 | Unexpected application error |

### Authorization
`@UseGuards(JwtAuthGuard)` — any authenticated role (`MEMBER` or `ADMIN`).
There is no `:id` parameter, so this endpoint cannot be used to target
another user's password; identity comes from `@CurrentUser()`.

### Input Validation
- `currentPassword`: required, non-empty
- `newPassword`: required, must satisfy the same complexity/length rule
  defined in IKM-1.1 — do not redefine password complexity rules here
- `newPassword` must differ from `currentPassword`

### Change Flow
1. `JwtAuthGuard` authenticates the request; get `userId` from `@CurrentUser()`
2. Load the user's stored password hash
3. Verify `currentPassword` against it using the IKM-1.1 hashing utility — if it doesn't match, return 401 with a generic message
4. Validate `newPassword` differs from `currentPassword`
5. Hash `newPassword`; update `password_hash`
6. Return success

### Important
**Refresh token decision:** changing a password does **not** revoke
existing refresh tokens in this sprint — consistent with IKM-1.6's default
of not building a token blocklist. Existing sessions on other devices
remain valid. Flag if forced logout-everywhere on password change is
required.

### Acceptance Criteria

**Endpoint**
- [ ] Correct `currentPassword` + valid `newPassword` returns `200` and updates the stored hash

**Authorization**
- [ ] Unauthenticated request returns `401`
- [ ] Both `MEMBER` and `ADMIN` can change their own password
- [ ] There is no way to target another user's password through this endpoint (no `:id` param)

**Validation**
- [ ] Missing `currentPassword` or `newPassword` returns `400`
- [ ] Weak `newPassword` (fails IKM-1.1's complexity rule) returns `400`
- [ ] `newPassword === currentPassword` returns `400`
- [ ] Password complexity rules are reused from IKM-1.1, never redefined here

**Security**
- [ ] Wrong `currentPassword` returns `401` with a generic message
- [ ] Verification and hashing use the IKM-1.1 utility — no plaintext comparison
- [ ] Response never includes a password or password hash
- [ ] No plaintext password or hash appears in logs

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/500

**Automated Tests**
- [ ] Unit tests: successful change, wrong current password, weak new password, new equals current, hash updated correctly
- [ ] Integration tests: full flow against a test database; unauthenticated request returns 401

**Code Quality**
- [ ] No linting errors
- [ ] No duplicated password-complexity rules
- [ ] No unnecessary ownership/authorization logic added beyond `JwtAuthGuard`

### Dependencies
IKM-1.1, IKM-1.4

### Out of Scope
Forgot-password / reset-without-current-password flow (email or SMS
based — not yet scheduled, flag if needed), forced logout of other
sessions on change, refresh-token blocklist, multi-session management