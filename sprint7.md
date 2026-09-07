# Sprint 7 — Withdrawals

This sprint introduces the ability for Admins to record money leaving the Ikimina platform (e.g., loans, payouts, operational expenses).

---

## IKM-7.1 — `Withdrawal` schema, entities & repository

### Goal
Store a trustworthy record of all outbound funds.

### Description
Create the `withdrawals` table and necessary backend layers.

### Requirements
- **`withdrawals` table**: `id`, `amount`, `withdrawal_date`, `beneficiary` (string or member_id), `category`, `description`, `supporting_doc_url`, `created_by` (FK -> users.id), `created_at`.
- **Enums**: `WithdrawalCategory` (LOAN, PAYOUT, EXPENSE, OTHER).
- **Repository Methods**: `createWithdrawal`, `findWithdrawals`.

### Acceptance Criteria
- Migrations created and executed successfully.
- Domain entities and enums implemented.

---

## IKM-7.2 — `POST /withdrawals` (Admin records withdrawal)

### User Story
As an Admin, I want to record a withdrawal of funds from the collective pool.

### Description
Unlike contributions, withdrawals do not require a separate approval step. A single Admin records it, and it immediately affects the ledger. It mandates a full audit log.

### Acceptance Criteria
- Endpoint accepts `amount`, `withdrawalDate`, `beneficiary`, `category`, `description`, and an optional `supportingDoc`.
- Records the withdrawal directly.
- Triggers a full audit log entry containing the details of the withdrawal and the Admin who created it (to be fully realized in Sprint 13, but the placeholder must exist).
- Only accessible by `ADMIN`.

---

## IKM-7.3 — `GET /withdrawals` (Admin lists/filters withdrawals)

### User Story
As an Admin, I want to view the history of all withdrawals.

### Acceptance Criteria
- Supports pagination and filtering by date range and category.
- Returns withdrawal records including the creator's user details.
- Only accessible by `ADMIN`.
