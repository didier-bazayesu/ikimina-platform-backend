# Sprint 6 — Penalties

This sprint implements the generation of penalties for overdue monthly obligations and the process for members to pay these penalties, including admin approval, rejection, or waiver.

---

## IKM-6.1 — `Penalty` schema, entities & repository

### Goal
Establish the foundation for tracking and paying penalties based on overdue monthly obligations.

### Description
Create `penalties` and `penalty_payments` tables, along with domain entities, enums, and a repository interface/mock.

### Requirements
- **`penalties` table**: `id`, `member_id`, `monthly_obligation_id` (FK), `amount`, `status` (UNPAID, PENDING, PAID, WAIVED), `created_at`, `updated_at`.
- **`penalty_payments` table**: (Similar to contribution_payments) `id`, `penalty_id` (FK), `amount`, `payment_date`, `method`, `reference`, `proof_url`, `status` (PENDING, APPROVED, REJECTED), `rejection_reason`, `reviewed_by`, `reviewed_at`, `created_at`.
- **Enums**: `PenaltyStatus` (UNPAID, PENDING, PAID, WAIVED), `PenaltyPaymentStatus` (PENDING, APPROVED, REJECTED).
- **Repository Methods**: `createPenalty`, `findPenaltyById`, `findPenaltiesByMember`, `updatePenaltyStatus`, `createPenaltyPayment`, `findPenaltyPaymentById`, `updatePenaltyPaymentStatus`.

### Acceptance Criteria
- Migrations created and executed successfully.
- Domain entities and enums implemented.
- Repository interface and Postgres implementation completed and tested via mocks.

---

## IKM-6.2 — Daily Penalty Scheduler

### Goal
Automatically generate penalties for overdue monthly obligations based on system settings.

### Description
Implement a daily cron job (using `@nestjs/schedule` in `Africa/Kigali` timezone) that finds active members with unpaid obligations past the due day and creates a penalty.

### Acceptance Criteria
- Scheduler runs daily at a configured time.
- Idempotent: Does not create duplicate penalties for the same obligation.
- Penalty amount is calculated using the system setting's penalty percentage at the time of generation.
- Unit tests cover the idempotency and date boundary conditions using a mocked time provider.

---

## IKM-6.3 — `POST /penalty-payments` (Member submits penalty payment)

### User Story
As a Member, I want to submit evidence of paying a penalty, so that it can be reviewed and cleared.

### Acceptance Criteria
- Endpoint accepts `penaltyId`, `amount`, `paymentDate`, `method`, `reference`, `proof` file.
- Validates that the penalty belongs to the caller and is `UNPAID`.
- Changes penalty status to `PENDING` to prevent duplicate submissions.
- Uploads proof via storage adapter.
- Returns 201 Created.

---

## IKM-6.4 — `GET /penalty-payments` & `GET /penalty-payments/me` (Admin lists & Member views)

### Goal
Allow Admins to view pending penalty payments for review, and Members to see their own submissions.

### Acceptance Criteria
- `GET /penalty-payments` (Admin) supports pagination and filtering by status and memberId.
- `GET /penalty-payments/me` (Member) returns the authenticated member's penalty payments.
- Swagger documentation added.

---

## IKM-6.5 — `PATCH /penalty-payments/:id/approve` & `PATCH /penalty-payments/:id/reject`

### User Story
As an Admin, I want to approve or reject a penalty payment submission.

### Acceptance Criteria
- `approve` changes payment status to `APPROVED` and associated penalty status to `PAID`.
- `reject` requires a reason, changes payment status to `REJECTED`, and reverts penalty status to `UNPAID`.
- Both operations are fully transactional.

---

## IKM-6.6 — `PATCH /penalties/:id/waive` (Admin waives penalty)

### User Story
As an Admin, I want to directly waive a penalty for a member if there are extenuating circumstances.

### Acceptance Criteria
- Changes penalty status to `WAIVED`.
- Returns 200 OK.
- Only Admins can perform this action.
