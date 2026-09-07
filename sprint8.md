# Sprint 8 — Transactions / Ledger

This sprint creates a unified read-model for all financial movements in the system (approved contributions, approved penalty payments, and withdrawals).

---

## IKM-8.1 — Unified Transaction Service and Repository

### Goal
Provide a single source of truth for all historical financial transactions without creating redundant write tables.

### Description
Instead of maintaining a separate `ledger` table that is prone to sync issues, we will build a read model that UNIONs data from `contribution_payments` (APPROVED), `penalty_payments` (APPROVED), and `withdrawals`.

### Requirements
- **SQL Query**: A robust view or unified query using `UNION ALL`.
- **Fields mapped**: `transaction_id`, `type` (CONTRIBUTION, PENALTY, WITHDRAWAL), `amount` (positive for inflows, negative for withdrawals), `member_id` (nullable for general expenses), `date`, `reference`.
- **Repository Methods**: `getTransactions(filters, pagination)`, `calculateAvailableBalance()`.

### Acceptance Criteria
- SQL query accurately pulls from the 3 tables and normalizes the output.
- `calculateAvailableBalance()` accurately sums inflows and subtracts outflows.

---

## IKM-8.2 — `GET /transactions` Endpoint

### User Story
As an Admin or Member, I want to see a unified ledger of financial movements.

### Acceptance Criteria
- Endpoint returns a paginated list of unified transactions.
- Members can only see their own transactions (contributions and penalties).
- Admins can see all transactions, filterable by member, type, and date range.
- Accessible by both `ADMIN` and `MEMBER` with role-based scoping in the service layer.
