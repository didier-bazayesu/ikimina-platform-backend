import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatNumber } from '../../lib/format'
import { format } from 'date-fns'
import { Avatar } from '../../components/ui/Avatar'
import { Download } from 'lucide-react'

interface Penalty {
  id: string
  memberId: string
  monthlyObligationId: string
  amount: number
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'WAIVED'
  createdAt: string
  updatedAt: string
  month?: number
  year?: number
  memberNumber?: string
  memberName?: string
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function PenaltiesPage() {
  const [filter, setFilter] = useState<'UNPAID' | 'PAID' | 'ALL'>('UNPAID')

  const { data, isLoading } = useQuery<{ items: Penalty[] }>({
    queryKey: ['adminPenalties'],
    queryFn: async () => {
      // Fetch up to 100 penalties for summary calculations and listing
      const res = await api.get('/penalties', {
        params: { limit: 100 },
      })
      const payload = (res.data as any)?.data ?? res.data
      return {
        items: payload?.items ?? [],
      }
    },
  })

  const allPenalties = data?.items ?? []

  const stats = useMemo(() => {
    let generatedCount = 0
    let generatedAmount = 0
    let paidCount = 0
    let paidAmount = 0
    let unpaidCount = 0
    let unpaidAmount = 0

    allPenalties.forEach(p => {
      generatedCount++
      generatedAmount += p.amount

      if (p.status === 'PAID') {
        paidCount++
        paidAmount += p.amount
      } else if (p.status === 'UNPAID' || p.status === 'PENDING') {
        unpaidCount++
        unpaidAmount += p.amount
      }
    })

    return {
      generatedCount,
      generatedAmount,
      paidCount,
      paidAmount,
      unpaidCount,
      unpaidAmount
    }
  }, [allPenalties])

  const filteredPenalties = useMemo(() => {
    let list = [...allPenalties]
    
    if (filter === 'UNPAID') {
      list = list.filter(p => p.status === 'UNPAID' || p.status === 'PENDING')
    } else if (filter === 'PAID') {
      list = list.filter(p => p.status === 'PAID')
    }
    
    // Sort by created date descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return list
  }, [allPenalties, filter])

  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const exportToCsv = () => {
    if (filteredPenalties.length === 0) return

    const headers = ['Member', 'Period', 'Reason', 'Amount', 'Generated', 'Status']
    const rows = filteredPenalties.map(p => [
      `"${p.memberName || 'Unknown'}"`,
      `"${p.month && p.year ? `${MONTH_NAMES[p.month - 1]} ${p.year}` : '-'}"`,
      '"Missed contribution"',
      p.amount,
      `"${format(new Date(p.createdAt), 'dd MMM yyyy')}"`,
      `"${p.status === 'PENDING' ? 'Unpaid' : p.status.charAt(0) + p.status.slice(1).toLowerCase()}"`
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `penalties_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-6xl">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl border border-border-warm shadow-sm">
        <h1 className="text-2xl font-bold font-heading text-text-main pl-2">Penalties</h1>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-cream/50 border border-border-warm rounded-lg">
            <button
              onClick={() => setFilter('UNPAID')}
              className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'UNPAID' ? 'bg-text-main shadow-sm text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              Unpaid
            </button>
            <button
              onClick={() => setFilter('PAID')}
              className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'PAID' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              Paid
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
            >
              All
            </button>
          </div>
          <button 
            onClick={exportToCsv}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-border-warm text-text-main font-medium rounded-lg hover:bg-bg-warm transition-colors text-sm"
          >
            <Download className="w-4 h-4 text-text-muted" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-border-warm p-6 shadow-sm">
          <p className="text-[10px] font-bold text-text-muted tracking-wider uppercase mb-2">Total Generated</p>
          <div className="text-3xl font-heading font-bold text-text-main mb-1">
            {formatNumber(stats.generatedAmount)}
          </div>
          <p className="text-sm text-text-muted">{stats.generatedCount} penalties since Jan 2025</p>
        </div>
        
        <div className="bg-white rounded-xl border border-border-warm p-6 shadow-sm">
          <p className="text-[10px] font-bold text-brand-green tracking-wider uppercase mb-2">Paid</p>
          <div className="text-3xl font-heading font-bold text-brand-green mb-1">
            {formatNumber(stats.paidAmount)}
          </div>
          <p className="text-sm text-text-muted">{stats.paidCount} settled</p>
        </div>
        
        <div className="bg-[#FFF8F8] rounded-xl border border-terracotta/20 p-6 shadow-sm">
          <p className="text-[10px] font-bold text-terracotta tracking-wider uppercase mb-2">Unpaid</p>
          <div className="text-3xl font-heading font-bold text-terracotta mb-1">
            {formatNumber(stats.unpaidAmount)}
          </div>
          <p className="text-sm text-terracotta/70">{stats.unpaidCount} outstanding</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-warm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-warm/50 border-b border-border-warm text-[10px] font-bold tracking-wider uppercase text-text-muted">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Generated</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    Loading penalties...
                  </td>
                </tr>
              ) : filteredPenalties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    No penalties found.
                  </td>
                </tr>
              ) : (
                filteredPenalties.map((penalty) => (
                  <tr key={penalty.id} className="hover:bg-bg-warm/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={getInitials(penalty.memberName)} className="w-8 h-8 text-xs bg-indigo-500 text-white" />
                        <span className="font-bold text-text-main text-sm">{penalty.memberName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-text-main">
                        {penalty.month && penalty.year ? `${MONTH_NAMES[penalty.month - 1]} ${penalty.year}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted">Missed contribution</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-text-main">{formatNumber(penalty.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted">{format(new Date(penalty.createdAt), 'dd MMM yyyy')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {penalty.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-tint text-brand-green">
                          Paid
                        </span>
                      ) : penalty.status === 'UNPAID' || penalty.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-terracotta-tint text-terracotta">
                          Unpaid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cream text-text-muted">
                          Waived
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
