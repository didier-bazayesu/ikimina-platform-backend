import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { formatNumber } from '../../lib/format'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { format, parseISO } from 'date-fns'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface ContributionAllocation {
  month?: number
  year?: number
}

interface ContributionPayment {
  id: string
  amount: number
  paymentDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  allocations: ContributionAllocation[]
  createdAt: string
}

interface PenaltyPayment {
  id: string
  amount: number
  paymentDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

interface Penalty {
  id: string
  month: number
  year: number
  amount: number
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'WAIVED'
  createdAt: string
}

export function HistoryView({ memberId = 'me', showHeader = true }: { memberId?: string, showHeader?: boolean }) {
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL')

  const { data: contributionsData, isLoading: loadingC } = useQuery({
    queryKey: ['contribution-payments', memberId],
    queryFn: async () => {
      const url = memberId === 'me' ? '/contribution-payments/me?limit=100' : `/contribution-payments?memberId=${memberId}&limit=100`
      const res = await api.get<{ items: ContributionPayment[] }>(url)
      return res.data?.items || (res as any).items || []
    }
  })

  const { data: penaltyPaymentsData, isLoading: loadingPP } = useQuery({
    queryKey: ['penalty-payments', memberId],
    queryFn: async () => {
      const url = memberId === 'me' ? '/penalty-payments/me?limit=100' : `/penalty-payments?memberId=${memberId}&limit=100`
      const res = await api.get<{ items: PenaltyPayment[] }>(url)
      return res.data?.items || (res as any).items || []
    }
  })

  const { data: penaltiesData, isLoading: loadingP } = useQuery({
    queryKey: ['penalties', memberId],
    queryFn: async () => {
      const url = memberId === 'me' ? '/penalties/me?limit=100' : `/penalties?memberId=${memberId}&limit=100`
      const res = await api.get<{ items: Penalty[] }>(url)
      return res.data?.items || (res as any).items || []
    }
  })

  const contributions = contributionsData || []
  const penaltyPayments = penaltyPaymentsData || []
  const penalties = penaltiesData || []

  // Combine contributions and penalty payments that were submitted together
  // We match them if they have the exact same paymentDate and were created within 60 seconds of each other
  const transactions = contributions.map(c => {
    const cTime = new Date(c.createdAt).getTime()
    const linkedPenaltyPayments = penaltyPayments.filter(p => {
      if (p.paymentDate.split('T')[0] !== c.paymentDate.split('T')[0]) return false
      const pTime = new Date(p.createdAt).getTime()
      return Math.abs(cTime - pTime) < 60000 // 60 seconds window
    })
    
    const penaltyAmount = linkedPenaltyPayments.reduce((sum, p) => sum + p.amount, 0)
    
    // Sort allocations to get range
    const sortedAlloc = [...(c.allocations || [])].sort((a, b) => {
      if (a.year === b.year) return (a.month || 0) - (b.month || 0)
      return (a.year || 0) - (b.year || 0)
    })
    
    let monthsLabel = '-'
    if (sortedAlloc.length > 0) {
      const first = sortedAlloc[0]
      const last = sortedAlloc[sortedAlloc.length - 1]
      if (first.month === last.month && first.year === last.year) {
        monthsLabel = `${MONTH_NAMES[(first.month || 1) - 1]} ${first.year}`
      } else {
        monthsLabel = `${MONTH_NAMES[(first.month || 1) - 1]}-${MONTH_NAMES[(last.month || 1) - 1]} ${last.year}`
      }
    }

    return {
      id: c.id,
      date: new Date(c.paymentDate),
      type: 'Contribution',
      amount: c.amount,
      months: monthsLabel,
      penalty: penaltyAmount,
      status: c.status
    }
  })

  // Add any standalone penalty payments that weren't merged
  penaltyPayments.forEach(p => {
    const pTime = new Date(p.createdAt).getTime()
    const wasMerged = contributions.some(c => {
      if (c.paymentDate.split('T')[0] !== p.paymentDate.split('T')[0]) return false
      const cTime = new Date(c.createdAt).getTime()
      return Math.abs(cTime - pTime) < 60000
    })
    if (!wasMerged) {
      transactions.push({
        id: p.id,
        date: new Date(p.paymentDate),
        type: 'Penalty',
        amount: p.amount,
        months: '-',
        penalty: p.amount, // It is the penalty
        status: p.status
      })
    }
  })

  transactions.sort((a, b) => b.date.getTime() - a.date.getTime())

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'ALL') return true
    return t.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF4E5] text-[#B26B00]"><div className="w-1.5 h-1.5 rounded-full bg-[#B26B00]"></div>Pending</span>
      case 'APPROVED':
      case 'PAID':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-tint text-brand-green"><div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>{status === 'PAID' ? 'Paid' : 'Approved'}</span>
      case 'REJECTED':
      case 'UNPAID':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-terracotta-tint text-terracotta"><div className="w-1.5 h-1.5 rounded-full bg-terracotta"></div>{status === 'UNPAID' ? 'Unpaid' : 'Rejected'}</span>
      case 'WAIVED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cream text-text-muted"><div className="w-1.5 h-1.5 rounded-full bg-text-muted"></div>Waived</span>
      default:
        return <span>{status}</span>
    }
  }

  const isLoading = loadingC || loadingPP || loadingP

  return (
    <div className="w-full font-body">
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-text-main tracking-tight mb-2">My transactions & penalties</h1>
            <p className="text-text-muted text-sm">Every record you've submitted, and every penalty on your account.</p>
          </div>
          <div className="flex p-1 bg-cream/50 border border-border-warm rounded-lg">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-text-main shadow-sm text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'APPROVED' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'PENDING' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Pending
            </button>
          </div>
        </div>
      )}

      {/* When no header, show tabs inline for admin view */}
      {!showHeader && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-text-main px-1 text-[15px]">Transaction history</h3>
          <div className="flex p-1 bg-cream/50 border border-border-warm rounded-lg scale-90 origin-right">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-text-main shadow-sm text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'APPROVED' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'PENDING' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Pending
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Transactions Table */}
        <div className="bg-surface rounded-2xl shadow-card border border-border-warm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cream/30 border-b border-border-warm">
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Months</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Penalty</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-text-muted text-sm">Loading...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-text-muted text-sm font-medium">No transactions found</td></tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-6 py-4 text-[13px] font-medium text-text-main whitespace-nowrap">
                        {format(t.date, 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-semibold text-text-main">
                        {t.type}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-text-main">
                        {formatNumber(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-text-muted font-medium">
                        {t.months}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-semibold text-terracotta">
                        {t.penalty > 0 ? formatNumber(t.penalty) : <span className="text-text-muted font-normal">&mdash;</span>}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(t.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Penalties Section */}
        <div>
          <h3 className="font-bold text-text-main mb-4 px-1 text-[15px]">Penalties</h3>
          <div className="bg-surface rounded-2xl shadow-card border border-border-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cream/30 border-b border-border-warm">
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Period</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Reason</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted tracking-[0.05em] uppercase">Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted text-sm">Loading...</td></tr>
                  ) : penalties.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted text-sm font-medium">No penalties on this account</td></tr>
                  ) : (
                    penalties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(p => (
                      <tr key={p.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-6 py-4 text-[13px] font-bold text-text-main whitespace-nowrap">
                          {FULL_MONTH_NAMES[p.month - 1]} {p.year}
                        </td>
                        <td className="px-6 py-4 text-[13px] text-text-muted">
                          Missed contribution
                        </td>
                        <td className="px-6 py-4 text-[13px] font-bold text-text-main">
                          {formatNumber(p.amount)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(p.status)}
                        </td>
                        <td className="px-6 py-4 text-[13px] text-text-muted font-medium whitespace-nowrap">
                          {format(new Date(p.createdAt), 'dd MMM yyyy')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <HistoryView memberId="me" showHeader={true} />
    </div>
  )
}
