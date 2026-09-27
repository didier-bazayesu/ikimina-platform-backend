import type { ReactNode } from 'react'
import { useAdminDashboard, useMemberDashboard } from '../api/dashboards'
import { useAuth } from '../auth/AuthContext'
import { formatMoney } from '../lib/format'

// Placeholder pages that prove the API wiring works end to end.
// Swap the markup for the Figma dashboards; the hooks stay.

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>{user?.email}</span>
          <button onClick={() => void logout()} className="rounded border px-3 py-1">
            Log out
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { data, isLoading, error } = useAdminDashboard()
  return (
    <Shell title="Admin dashboard">
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error.message}</p>}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Active members" value={data.totalActiveMembers} />
          <Stat label="Available balance" value={formatMoney(data.availableBalance)} />
          <Stat label="Contribution payments to review" value={data.pendingContributionPayments} />
          <Stat label="Penalty payments to review" value={data.pendingPenaltyPayments} />
          <Stat label="Withdrawals this month" value={formatMoney(data.totalWithdrawalsCurrentMonth)} />
        </div>
      )}
    </Shell>
  )
}

export function MemberDashboardPage() {
  const { data, isLoading, error } = useMemberDashboard()
  return (
    <Shell title="My dashboard">
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error.message}</p>}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Approved contributions" value={formatMoney(data.totalApprovedContributions)} />
          <Stat label="Approved penalties" value={formatMoney(data.totalApprovedPenalties)} />
          <Stat label="Unpaid obligations" value={data.outstandingObligationsCount} />
          <Stat label="Amount still due" value={formatMoney(data.outstandingObligationsAmount)} />
          <Stat label="Unpaid penalties" value={formatMoney(data.unpaidPenaltiesAmount)} />
        </div>
      )}
    </Shell>
  )
}
