import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatNumber, formatDate } from '../../lib/format'
import { Avatar } from '../../components/ui/Avatar'
import { Search, ChevronLeft } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { HistoryView } from '../member/HistoryPage'
import { Button } from '../../components/ui/Button'
import { format, differenceInMonths } from 'date-fns'

// ─── Types matching backend response ──────────────────────────────────────────

interface MemberWithStats {
  id: string
  memberNumber: string
  fullName: string
  email: string
  phone?: string
  joinedDate?: string
  status: 'ACTIVE' | 'EXITED' | 'SUSPENDED'
  shares: number
  contributed: number
  unpaidPenalty: number
  missing: number
  lastPayment: string | null
}

function MemberDetailView({ member, onBack }: { member: MemberWithStats; onBack: () => void }) {
  const initials = member.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
  
  let monthsInGroup = 0
  if (member.joinedDate) {
    monthsInGroup = differenceInMonths(new Date(), new Date(member.joinedDate))
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Top Actions */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-text-main hover:text-brand-green transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to members
        </button>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-xs py-1.5 px-4 h-auto">Edit</Button>
          <Button variant="outline" className="text-xs py-1.5 px-4 h-auto text-terracotta border-terracotta hover:bg-terracotta/5">
            {member.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-border-warm p-6 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <Avatar initials={initials} className="w-16 h-16 text-lg bg-[#C8704A] text-white" />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold font-heading text-text-main">{member.fullName}</h2>
              <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider ${
                member.status === 'ACTIVE' ? 'bg-brand-green/10 text-brand-green' : 'bg-border-warm text-text-muted'
              }`}>
                {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-text-muted text-[13px] leading-relaxed">
              Member {member.memberNumber} &middot; {member.phone || 'No phone'} &middot; <span className="text-brand-green">{member.email}</span><br />
              Joined {member.joinedDate ? format(new Date(member.joinedDate), 'MMMM yyyy') : 'Unknown'} &middot; {monthsInGroup} months in the group
            </p>
          </div>
        </div>
        <Button variant="secondary" className="whitespace-nowrap bg-brand-green/10 text-brand-green border-0 hover:bg-brand-green/20">
          Record on behalf
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="TOTAL SHARES"
          value={member.shares.toString()}
          caption={`of ${monthsInGroup} months`}
        />
        <StatCard
          label="TOTAL CONTRIBUTED"
          value={formatNumber(member.contributed)}
          unit="RWF"
        />
        <StatCard
          label="UNPAID PENALTY"
          value={formatNumber(member.unpaidPenalty)}
          unit="RWF"
          tone={member.unpaidPenalty > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="MISSING MONTHS"
          value={member.missing.toString()}
        />
      </div>

      {/* Reused History View */}
      <HistoryView memberId={member.id} showHeader={false} />
    </div>
  )
}

export function MembersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery<{ items: MemberWithStats[]; total: number }>({
    queryKey: ['adminMembers', debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/members', {
        params: {
          limit: 100, // Load enough for the table view
          search: debouncedSearch || undefined,
        },
      })
      const payload = (res.data as any)?.data ?? res.data
      return {
        items: payload?.items ?? [],
        total: payload?.total ?? 0,
      }
    },
  })

  const members = data?.items ?? []
  const total = data?.total ?? 0
  const activeCount = members.filter(m => m.status === 'ACTIVE').length

  const initials = (name: string) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const selectedMember = members.find(m => m.id === selectedMemberId)

  if (selectedMember) {
    return <MemberDetailView member={selectedMember} onBack={() => setSelectedMemberId(null)} />
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold font-heading text-text-main">Members</h1>
          {!isLoading && (
            <span className="text-text-muted text-sm">
              {total} total &middot; {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-border-warm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all w-64 text-sm"
            />
          </div>
          <button className="px-4 py-2 bg-brand-green text-white text-sm font-bold rounded-lg hover:bg-brand-green/90 transition-colors flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Add member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-warm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-warm/50 border-b border-border-warm text-[10px] font-bold tracking-wider uppercase text-text-muted">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Shares</th>
                <th className="px-6 py-4">Contributed</th>
                <th className="px-6 py-4">Unpaid Penalty</th>
                <th className="px-6 py-4">Missing</th>
                <th className="px-6 py-4">Last Payment</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-border-warm/50" />
                      <div className="space-y-2 py-1">
                        <div className="h-4 w-32 bg-border-warm/50 rounded" />
                        <div className="h-3 w-16 bg-border-warm/50 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-border-warm/50 rounded-full" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => setSelectedMemberId(member.id)}
                    className="hover:bg-bg-warm/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={initials(member.fullName)} className="w-10 h-10 text-sm bg-indigo-500 text-white" />
                        <div>
                          <p className="font-bold text-text-main text-sm">{member.fullName}</p>
                          <p className="text-text-muted text-xs mt-0.5">{member.memberNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-main">{member.shares}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-main">{formatNumber(member.contributed)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {member.unpaidPenalty > 0 ? (
                        <span className="text-sm font-bold text-terracotta">{formatNumber(member.unpaidPenalty)}</span>
                      ) : (
                        <span className="text-sm text-text-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-muted">{member.missing}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-muted">
                        {member.lastPayment ? formatDate(member.lastPayment) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                        member.status === 'ACTIVE'
                          ? 'bg-brand-green/10 text-brand-green'
                          : 'bg-border-warm text-text-muted'
                      }`}>
                        {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
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
