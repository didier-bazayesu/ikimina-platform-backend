# Sprint 5 — Contributions

One ticket template used throughout: IKM-5.1 is a **Setup Ticket**;
IKM-5.2 – IKM-5.6 are **API Story Tickets**.

This sprint implements the core loop from README §3: a member submits
evidence of an external payment, an Admin approves or rejects it, and
approval is what actually marks the covered obligation(s) `PAID`.

---

## IKM-5.1 — `ContributionPayment` & `ContributionAllocation` schema, entities & repository

### Goal
Every write in this sprint (submit, approve, reject) and every read in
Sprints 8–11 (transactions, dashboards, reports, statements) needs a
trustworthy record of "what was paid, for which months, and by whom
approved." This ticket is that record.

### Description
Create `contribution_payments` and `contribution_allocations` as two
related tables (README §3: "a single payment is stored as one
`ContributionPayment` with multiple `ContributionAllocation` rows, never
as one opaque lump sum"), plus the domain entities, enums, and a single
repository interface/mock covering both.

### Requirements + why

| Requirement | Why it's required |
|---|---|
| `contribution_payments` migration: `id`, `member_id` (FK), `amount`, `payment_date`, `method`, `reference` (nullable), `notes` (nullable), `proof_url`, `status`, `rejection_reason` (nullable), `reviewed_by` (nullable FK → `users.id`), `reviewed_at` (nullable), `created_at` | This is the header record of a real-world payment event — `amount` is the total the member claims to have paid, split across one or more months via allocations |
| `contribution_allocations` migration: `id`, `contribution_payment_id` (FK), `monthly_obligation_id` (FK), `amount`, `created_at` | One row per covered month, per README §3 — this is what makes a 3-month payment auditable per-month instead of one ambiguous total |
| `ContributionStatus` enum: `PENDING`, `APPROVED`, `REJECTED` | Mirrors the flow diagram in README §3 exactly — no other states exist |
| `ContributionMethod` enum: `MOMO`, `BANK`, `CASH` | The three external channels named in README §1 — closed set, not a free-text field |
| FK `member_id → members.id`, `monthly_obligation_id → monthly_obligations.id`, `contribution_payment_id → contribution_payments.id`, all `ON DELETE RESTRICT` | Consistent with the rest of the schema — financial history must never silently disappear via cascade |
| `application/contribution/contribution-payment.ts`, `contribution-allocation.ts`, `contribution-status.ts`, `contribution-method.ts` | Typed representations and enums for every service in this sprint |
| `contribution.repository.interface.ts` + `.mock.ts`, covering: create-payment-with-allocations (atomic), find-by-id (with allocations), list (filterable by member/status), find-pending-or-approved-allocation-for-obligation, mark-approved, mark-rejected | Lets IKM-5.2 – IKM-5.6 be unit-tested without touching Postgres |
| `persistence/contribution.repository.ts` writes the payment + its allocations inside a single DB transaction | A payment must never exist without its allocations, or vice versa — partial writes here would corrupt the financial record |

### Acceptance Criteria
- [ ] Both migrations created with the columns above; FKs and `ON DELETE RESTRICT` in place
- [ ] `status` only accepts `PENDING` / `APPROVED` / `REJECTED`; `method` only accepts `MOMO` / `BANK` / `CASH`
- [ ] Domain entities and enums implemented
- [ ] `contribution.repository.interface.ts` and `.mock.ts` exist
- [ ] `persistence/contribution.repository.ts` implements every method above; the create operation is transactional (payment + all its allocations succeed or fail together)

### Dependencies
IKM-2.1 (members), IKM-4.1 (monthly obligations), IKM-1.1 (`users.id` for `reviewed_by`)

### Out of Scope
Any endpoint (IKM-5.2 – IKM-5.6), the storage adapter itself (already built in IKM-0.5)

### Code Quality
- [ ] No two `PENDING`/`APPROVED` allocations may exist for the same `monthly_obligation_id` at once. This **cannot** be a pure database constraint without denormalizing payment status onto the allocation row, so it must be enforced in the service layer inside a transaction with row-level locking (`SELECT ... FOR UPDATE` on the target obligation) before inserting. Document this explicitly as a known design trade-off, not an oversight.

---

## IKM-5.2 — `POST /contribution-payments` (Member submits payment evidence)

### User Story
As a Member, I want to submit evidence of a payment I made outside the
platform — amount, date, which month(s) it covers, method, reference, and
a proof file — so that an Admin can review and approve it.

### Description
Implement `POST /contribution-payments`. The member selects which of
their own unpaid obligations this payment covers (by ID — obtained from
`GET /monthly-obligations/me`, IKM-4.4), not by typing a raw month/year.

### API Endpoint
`POST /api/v1/contribution-payments`
`multipart/form-data` (includes the proof file)

### Request Body
`SubmitContributionPaymentDTO`:
- `obligationIds` (string[], required, non-empty — the caller's own `MonthlyObligation` IDs this payment covers)
- `amount` (number, required — must exactly equal the sum of the targeted obligations' `expected_amount`)
- `paymentDate` (date, required, not in the future)
- `method` (`MOMO` / `BANK` / `CASH`, required)
- `reference` (string, required for `MOMO` and `BANK`; optional for `CASH`)
- `notes` (string, optional)
- `proof` (file, required)

### Successful Response
Status: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "amount": 40000,
    "status": "PENDING",
    "method": "MOMO",
    "paymentDate": "2026-09-05",
    "allocations": [
      { "obligationId": "...", "month": 8, "year": 2026, "amount": 20000 },
      { "obligationId": "...", "month": 9, "year": 2026, "amount": 20000 }
    ]
  },
  "message": "Payment submitted for review"
}
```

### Possible Responses
| Status | Description |
|---|---|
| 201 | Payment submitted, status `PENDING` |
| 400 | Missing/malformed fields, `amount` doesn't match the sum of targeted obligations, targeted obligations span more than one currency, missing `reference` for `MOMO`/`BANK`, proof file fails type/size check |
| 401 | No valid access token |
| 403 | Authenticated user is not `MEMBER` |
| 404 | An `obligationId` doesn't exist or doesn't belong to the caller |
| 409 | One of the targeted obligations already has a `PENDING` or `APPROVED` allocation |
| 500 | Unexpected application error |

### Authorization
`@UseGuards(JwtAuthGuard)`, `@Roles(Role.MEMBER)`

### Input Validation
- `obligationIds`: required, non-empty; each must belong to the caller, have `status = UNPAID`, and have no existing `PENDING`/`APPROVED` allocation
- All targeted obligations must share the same `currency` — reject the batch if they don't (an edge case if settings' currency changed between the periods involved)
- `amount` must exactly equal the sum of the targeted obligations' `expected_amount` — no partial-month payments, per README §3
- `paymentDate`: required, valid date, not in the future
- `method`: required, one of the enum values
- `reference`: required when `method` is `MOMO` or `BANK`
- `proof`: required; basic MIME type (image or PDF) and size limit checked here — deeper upload-security hardening (Sprint 14) is out of scope for this ticket
- Reject any additional/unexpected fields

### Submission Flow
1. Validate the DTO
2. For each `obligationId`: verify it belongs to the caller, is `UNPAID`, and has no existing `PENDING`/`APPROVED` allocation (row-locked check, per IKM-5.1's code-quality note)
3. Verify all targeted obligations share one currency and that `amount` equals their summed `expected_amount`
4. Upload `proof` via the `storage` adapter (IKM-0.5); get back a URL
5. In one transaction: create the `ContributionPayment` (`status = PENDING`) and one `ContributionAllocation` per obligation (`amount` = that obligation's `expected_amount`)
6. Return the created payment with its allocations

### Acceptance Criteria

**Endpoint**
- [ ] Successful submission returns `201` with `status: PENDING` and all allocations

**Authorization**
- [ ] Non-Member (including unauthenticated) requests are rejected

**Validation**
- [ ] Mismatched `amount` vs. the sum of targeted obligations returns `400`
- [ ] Mixed-currency obligation set returns `400`
- [ ] Missing `reference` for `MOMO`/`BANK` returns `400`
- [ ] Invalid/oversized proof file returns `400`
- [ ] An `obligationId` not belonging to the caller, or not found, returns `404`
- [ ] An obligation already covered by a `PENDING`/`APPROVED` allocation returns `409`

**Business Rule**
- [ ] Each allocation's `amount` exactly equals its obligation's `expected_amount` — never a different value

**API Documentation**
- [ ] Documented in Swagger with 201/400/401/403/404/409/500

**Automated Tests**
- [ ] Unit tests: single-month happy path, multi-month happy path, amount mismatch, mixed currency, missing reference for MoMo, duplicate submission against a pending obligation
- [ ] Integration test using the storage mock (IKM-0.5) — no real upload in tests

**Code Quality**
- [ ] No linting errors
- [ ] Follows DTO/naming conventions in README §6

### Dependencies
IKM-5.1, IKM-4.1, IKM-2.1, IKM-0.5 (storage adapter), IKM-1.4

### Out of Scope
Editing or cancelling a pending submission (flag if needed — the current
design assumes an incorrect submission is simply rejected and resubmitted),
partial-month payments (explicitly unsupported per README §3)

---

## IKM-5.3 — `GET /contribution-payments` (Admin lists/filters payments)

### User Story
As an Admin, I want to list contribution payments — especially those still
`PENDING` — so that I can review evidence and act on it.

### API Endpoint
`GET /api/v1/contribution-payments`

### Query Parameters
- `status` (optional — `PENDING` / `APPROVED` / `REJECTED`)
- `memberId` (optional)
- `page`, `limit` (default `1`/`20`, `limit` capped at `100`)

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
        "memberNumber": "IKM-0001",
        "memberName": "...",
        "amount": 40000,
        "method": "MOMO",
        "status": "PENDING",
        "paymentDate": "2026-09-05",
        "proofUrl": "https://...",
        "allocations": [ { "month": 8, "year": 2026 }, { "month": 9, "year": 2026 } ]
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 3
  },
  "message": "Contribution payments retrieved"
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

### Acceptance Criteria

**Endpoint**
- [ ] Returns paginated, filtered list including member summary, allocations, and `proofUrl` for review

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Invalid `status` or out-of-range `limit` returns `400`

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/500

**Automated Tests**
- [ ] Unit tests: filter by status (especially `PENDING`), filter by member
- [ ] Integration test against a seeded test database

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-5.1, IKM-1.2

### Out of Scope
Approve/reject actions (IKM-5.4, IKM-5.5), the member's own view (IKM-5.6)

---

## IKM-5.4 — `PATCH /contribution-payments/:id/approve` (Admin approves)

### User Story
As an Admin, I want to approve a pending contribution payment, so that the
covered obligation(s) are marked paid and the member's standing updates.

### Description
Implement the approval action. This is the single point where an
obligation actually transitions to `PAID` — it calls into IKM-4.1's
`mark-paid` repository method for every allocation on this payment.

### API Endpoint
`PATCH /api/v1/contribution-payments/:id/approve`

### Request Body
None.

### Successful Response
Status: `200 OK`
```json
{ "success": true, "data": { "id": "...", "status": "APPROVED" }, "message": "Payment approved" }
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Payment approved, obligations marked `PAID` |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 404 | No payment with that `id` |
| 409 | Payment is not currently `PENDING` (already approved or rejected) |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Approval Flow
1. Load payment by `id` (404 if missing)
2. Verify `status === PENDING` (409 otherwise)
3. In one transaction: set `status = APPROVED`, `reviewed_by` = calling Admin's `userId`, `reviewed_at` = now; for every allocation on this payment, mark its linked `MonthlyObligation` as `PAID`
4. Return the updated payment

### Important
This is the entire "ledger updated" step from README §3's flow diagram —
there is no separate ledger table to write to. `Available balance` is
always computed live from approved records (README §3), so nothing else
needs to be written here. `Transaction`/`Ledger` (Sprint 8) is a read model
built by querying this data, not a separate write path.

### Acceptance Criteria

**Endpoint**
- [ ] Approving a `PENDING` payment sets its status to `APPROVED` and marks every allocated obligation `PAID`

**Authorization**
- [ ] Non-Admin requests rejected

**Business Rule**
- [ ] Approving a non-`PENDING` payment returns `409`, no state changes
- [ ] Unknown `id` returns `404`
- [ ] `reviewed_by` and `reviewed_at` are set on approval

**API Documentation**
- [ ] Documented in Swagger with 200/401/403/404/409/500

**Automated Tests**
- [ ] Unit tests: successful approval (verifies obligations flip to `PAID`), already-approved payment, already-rejected payment, not found

**Code Quality**
- [ ] No linting errors
- [ ] The payment-status update and the obligation `mark-paid` calls happen in one transaction — never partially applied

### Dependencies
IKM-5.1, IKM-4.1 (`mark-paid` method), IKM-1.2

### Out of Scope
Audit log entry (Sprint 13 retrofits this), notifying the member of
approval (Sprint 12 retrofits this)

---

## IKM-5.5 — `PATCH /contribution-payments/:id/reject` (Admin rejects, reason required)

### User Story
As an Admin, I want to reject a pending contribution payment with a
reason, so that the member understands why and can resubmit correctly.

### API Endpoint
`PATCH /api/v1/contribution-payments/:id/reject`

### Request Body
`RejectContributionPaymentDTO`:
- `reason` (string, required, non-empty)

### Successful Response
Status: `200 OK`
```json
{ "success": true, "data": { "id": "...", "status": "REJECTED", "rejectionReason": "..." }, "message": "Payment rejected" }
```

### Possible Responses
| Status | Description |
|---|---|
| 200 | Payment rejected |
| 400 | Missing/empty `reason` |
| 401 | No valid access token |
| 403 | Authenticated user is not `ADMIN` |
| 404 | No payment with that `id` |
| 409 | Payment is not currently `PENDING` |
| 500 | Unexpected application error |

### Authorization
`@Roles(Role.ADMIN)`

### Rejection Flow
1. Load payment by `id` (404 if missing)
2. Verify `status === PENDING` (409 otherwise)
3. Set `status = REJECTED`, `rejection_reason = reason`, `reviewed_by`, `reviewed_at`
4. Obligations targeted by this payment's allocations remain `UNPAID` — the allocation rows are **not** deleted (they stay as an audit trail); a rejected allocation no longer blocks a future submission for the same obligation, since the "existing `PENDING`/`APPROVED` allocation" check in IKM-5.2 only looks at those two statuses
5. Return the updated payment

### Acceptance Criteria

**Endpoint**
- [ ] Rejecting a `PENDING` payment sets `status = REJECTED` with the given reason
- [ ] Targeted obligations remain `UNPAID` and become submittable again

**Authorization**
- [ ] Non-Admin requests rejected

**Validation**
- [ ] Missing/empty `reason` returns `400`

**Business Rule**
- [ ] Rejecting a non-`PENDING` payment returns `409`
- [ ] Unknown `id` returns `404`
- [ ] Allocation rows are preserved, not deleted, after rejection

**API Documentation**
- [ ] Documented in Swagger with 200/400/401/403/404/409/500

**Automated Tests**
- [ ] Unit tests: successful rejection, missing reason, already-reviewed payment, not found, resubmission after rejection succeeds

**Code Quality**
- [ ] No linting errors

### Dependencies
IKM-5.1, IKM-1.2

### Out of Scope
Audit log entry (Sprint 13), notifying the member of rejection (Sprint 12)

---

## IKM-5.6 — `GET /contribution-payments/me` (Member views own payments)

### User Story
As a logged-in Member, I want to see my own submitted contribution
payments and their status, so I know what's pending, approved, or
rejected — and why, if rejected.

### API Endpoint
`GET /api/v1/contribution-payments/me`

### Query Parameters
- `status` (optional — `PENDING` / `APPROVED` / `REJECTED`)
- `page`, `limit` (default `1`/`20`, `limit` capped at `100`)

### Successful Response
Status: `200 OK` — same item shape as IKM-5.3, scoped to the caller's own
payments (no `memberId`/`memberName` fields needed since it's always the
caller).

### Possible Responses
| Status | Description |
|---|---|
| 200 | Own payments returned |
| 401 | No valid access token |
| 404 | Authenticated user has no linked `Member` record |
| 500 | Unexpected application error |

### Authorization
`@UseGuards(JwtAuthGuard)`, `@Roles(Role.MEMBER)`

### Acceptance Criteria

**Endpoint**
- [ ] Returns only the authenticated member's own payments, including `proofUrl` (so they can confirm what they uploaded) and `rejectionReason` where applicable

**Authorization**
- [ ] Unauthenticated request returns `401`
- [ ] No `:id`/`memberId` param — a member cannot view another member's payments through this endpoint by construction
- [ ] Non-`MEMBER` roles rejected

**API Documentation**
- [ ] Documented in Swagger with 200/401/404/500

**Automated Tests**
- [ ] Unit tests: filtered list, no linked member record
- [ ] Integration test using the `JwtAuthGuard` mock

**Code Quality**
- [ ] No linting errors
- [ ] Shares pagination/filtering logic with IKM-5.3 rather than duplicating it

### Dependencies
IKM-5.1, IKM-2.1, IKM-1.4

### Out of Scope
Editing own submissions — a rejected payment is resubmitted via a new
`POST /contribution-payments` (IKM-5.2) call, not edited in place