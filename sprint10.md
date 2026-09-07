# Sprint 10 — Reports

This sprint builds the reporting engine, allowing Admins to extract actionable data in bulk.

---

## IKM-10.1 — Contribution & Penalty Reports

### Goal
Provide aggregate views of incoming funds.

### Acceptance Criteria
- `GET /reports/contributions`: Returns contribution data filterable by date ranges, grouping by month or member.
- `GET /reports/penalties`: Returns penalty data filterable by status (generated/paid/outstanding/waived).

---

## IKM-10.2 — Defaulters Report

### Goal
Identify members who are behind on their obligations.

### Acceptance Criteria
- `GET /reports/defaulters`: Returns members with outstanding monthly obligations or unpaid penalties.
- Includes total missing months and total amount owed per member.

---

## IKM-10.3 — Withdrawal & Financial Summary Report

### Goal
Summarize outflows and the overall balance sheet.

### Acceptance Criteria
- `GET /reports/withdrawals`: Grouped by category over a date range.
- `GET /reports/financial-summary`: A combined inflow/outflow report over a specific period.

---

## IKM-10.4 — Report Exports (CSV/PDF)

### Goal
Allow Admins to download reports for offline use or accounting.

### Acceptance Criteria
- Extend the report endpoints (or create export specific ones) to support `?format=csv` and `?format=pdf`.
- Generate CSV directly using a fast library.
- Generate PDFs using a standard templating engine (e.g., pdfkit or puppeteer).
- Return files as downloadable streams.
