import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatNumber } from '../../lib/format'
import { format } from 'date-fns'
import { Avatar } from '../../components/ui/Avatar'
import { Download, Search } from 'lucide-react'

// Backend Interfaces
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
  memberName?: string
  notes?: string
}

interface Withdrawal {
  id: string
  amount: number
  withdrawalDate: string
  beneficiary: string
  description: string
  creatorName?: string
}

// Unified Row Type
interface TransactionRow {
  id: string
  date: string
  member: string
  type: 'Contribution' | 'Withdrawal'
  amount: number
  detail: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatAllocations(allocations: ContributionAllocation[]): string {
  if (!allocations || allocations.length === 0) return ''
  
  const valid = allocations.filter(a => a.month && a.year)
  if (valid.length === 0) return ''
  
  valid.sort((a, b) => {
    if (a.year !== b.year) return (a.year || 0) - (b.year || 0)
    return (a.month || 0) - (b.month || 0)
  })

  const first = valid[0]
  const last = valid[valid.length - 1]

  if (first.month === last.month && first.year === last.year) {
    return `${MONTH_NAMES[first.month! - 1]} ${first.year}`
  }

  if (first.year === last.year) {
    return `${MONTH_NAMES[first.month! - 1]}-${MONTH_NAMES[last.month! - 1]} ${first.year}`
  }

  return `${MONTH_NAMES[first.month! - 1]} ${first.year} - ${MONTH_NAMES[last.month! - 1]} ${last.year}`
}

export function TransactionsPage() {
  const [filter, setFilter] = useState<'ALL' | 'CONTRIBUTIONS' | 'WITHDRAWALS'>('ALL')
  const [search, setSearch] = useState('')

  const { data: contributionsData, isLoading: loadingC } = useQuery<{ items: ContributionPayment[] }>({
    queryKey: ['adminContributions'],
    queryFn: async () => {
      const res = await api.get('/contribution-payments', { params: { limit: 100 } })
      const payload = (res.data as any)?.data ?? res.data
      return { items: payload?.items ?? [] }
    },
  })

  const { data: withdrawalsData, isLoading: loadingW } = useQuery<{ items: Withdrawal[] }>({
    queryKey: ['adminWithdrawals'],
    queryFn: async () => {
      const res = await api.get('/withdrawals', { params: { limit: 100 } })
      const payload = (res.data as any)?.data ?? res.data
      return { items: payload?.items ?? [] }
    },
  })

  const isLoading = loadingC || loadingW

  const allRows = useMemo(() => {
    const rows: TransactionRow[] = []

    const contributions = contributionsData?.items ?? []
    contributions.forEach(c => {
      rows.push({
        id: `contrib-${c.id}`,
        date: c.paymentDate,
        member: c.memberName || 'Unknown',
        type: 'Contribution',
        amount: c.amount,
        detail: formatAllocations(c.allocations) || c.notes || '-',
        status: c.status
      })
    })

    const withdrawals = withdrawalsData?.items ?? []
    withdrawals.forEach(w => {
      rows.push({
        id: `with-${w.id}`,
        date: w.withdrawalDate,
        member: w.creatorName || w.beneficiary || 'Admin',
        type: 'Withdrawal',
        amount: -w.amount,
        detail: w.description || '-',
        status: 'APPROVED'
      })
    })

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return rows
  }, [contributionsData, withdrawalsData])

  const filteredRows = useMemo(() => {
    let list = allRows

    if (filter === 'CONTRIBUTIONS') {
      list = list.filter(r => r.type === 'Contribution')
    } else if (filter === 'WITHDRAWALS') {
      list = list.filter(r => r.type === 'Withdrawal')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => 
        r.member.toLowerCase().includes(q) || 
        r.detail.toLowerCase().includes(q)
      )
    }

    return list
  }, [allRows, filter, search])

  const getInitials = (name: string) => {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const exportToCsv = () => {
    if (filteredRows.length === 0) return

    const headers = ['Date', 'Member', 'Type', 'Amount', 'Detail', 'Status']
    const csvRows = filteredRows.map(r => [
      `"${format(new Date(r.date), 'dd MMM yyyy')}"`,
      `"${r.member}"`,
      `"${r.type}"`,
      r.amount,
      `"${r.detail}"`,
      `"${r.status.charAt(0) + r.status.slice(1).toLowerCase()}"`
    ])

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-6xl">
      {/* Header & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-heading text-text-main">Transactions</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex p-1 bg-white border border-border-warm rounded-lg shadow-sm">
            <button
              onClick={() => setFilter('ALL')}
              className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-text-main shadow-sm text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('CONTRIBUTIONS')}
              className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'CONTRIBUTIONS' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Contributions
            </button>
            <button
              onClick={() => setFilter('WITHDRAWALS')}
              className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'WITHDRAWALS' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Withdrawals
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-text-muted" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-48 border border-border-warm rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-shadow shadow-sm"
            />
          </div>

          {/* Export */}
          <button 
            onClick={exportToCsv}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-border-warm bg-white text-text-main font-medium rounded-lg hover:bg-bg-warm transition-colors text-sm shadow-sm"
          >
            <Download className="w-4 h-4 text-text-muted" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-warm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-bg-warm/50 border-b border-border-warm text-[10px] font-bold tracking-wider uppercase text-text-muted">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Detail</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-bg-warm/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted">{format(new Date(row.date), 'dd MMM yyyy')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={getInitials(row.member)} className="w-8 h-8 text-xs bg-indigo-500 text-white" />
                        <span className="font-bold text-text-main text-sm">{row.member}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${row.type === 'Contribution' ? 'bg-brand-green' : 'bg-terracotta'}`}></div>
                        <span className="text-sm text-text-muted">{row.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${row.type === 'Contribution' ? 'text-brand-green' : 'text-terracotta'}`}>
                        {row.type === 'Contribution' ? '+' : '-'}{formatNumber(Math.abs(row.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted">{row.detail}</span>
                    </td>
                    <td className="px-6 py-4">
                      {row.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-tint text-brand-green">
                          Approved
                        </span>
                      ) : row.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF4E5] text-[#B26B00]">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-terracotta-tint text-terracotta">
                          Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
