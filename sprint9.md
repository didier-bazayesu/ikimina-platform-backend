# Sprint 9 — Dashboards

This sprint delivers the high-level metrics for Members to understand their standing and for Admins to understand the health of the Ikimina.

---

## IKM-9.1 — `GET /dashboards/member` (Member Dashboard)

### User Story
As a Member, I want to see a summary of my financial standing, so I know if I am up to date or falling behind.

### Acceptance Criteria
- Computes and returns:
  - Total Approved Contributions
  - Total Approved Penalties
  - Outstanding Obligations (Count and Total Amount)
  - Unpaid Penalties (Total Amount)
- All values must be computed live from approved records, never stored statically.
- Restricted to `MEMBER` role.

---

## IKM-9.2 — `GET /dashboards/admin` (Admin Dashboard)

### User Story
As an Admin, I want to see a summary of the entire system's metrics.

### Acceptance Criteria
- Computes and returns:
  - Total Active Members
  - Available Balance (Total Inflows - Total Outflows)
  - Pending Contribution Payments (Count)
  - Pending Penalty Payments (Count)
  - Total Withdrawals (Current Month)
- All values computed live.
- Restricted to `ADMIN` role.
