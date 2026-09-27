import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatNumber } from '../../lib/format'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../auth/AuthContext'

interface PendingApprovalItem {
  id: string
  memberId: string
  memberName: string
  amount: number
  paymentDate: Date
  type: 'Contribution' | 'Penalty'
}

interface AdminDashboardAPIResponse {
  totalActiveMembers: number
  availableBalance: number
  pendingContributionPayments: number
  pendingPenaltyPayments: number
  totalWithdrawalsCurrentMonth: number
  totalContributionsAmount: number
  unpaidPenaltiesAmount: number
  totalPenaltiesGenerated: number
  paidObligationsCurrentMonth: number
  totalObligationsCurrentMonth: number
  recentPendingApprovals: PendingApprovalItem[]
}

export function AdminDashboardPage() {
  const { user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await api.get<AdminDashboardAPIResponse>('/dashboards/admin')
      return res.data || (res as any)
    }
  })

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-white rounded-xl border border-border-warm"></div>
  }

  if (error || !data) {
    return <div className="text-terracotta">Failed to load admin dashboard.</div>
  }

  const dashData = ((data as any).data || data) as AdminDashboardAPIResponse
  const pendingApprovalsCount = dashData.pendingContributionPayments + dashData.pendingPenaltyPayments
  
  const collectionRate = dashData.totalObligationsCurrentMonth > 0 
    ? Math.round((dashData.paidObligationsCurrentMonth / dashData.totalObligationsCurrentMonth) * 100) 
    : 0

  const pendingList = dashData.recentPendingApprovals || []

  
  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const timeAgo = (dateStr: string) => {
    const hours = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60))
    if (hours < 24) return `${hours} hours ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  // Fallback if admin has no member profile
  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayInitials = displayName.substring(0, 2).toUpperCase()

  return (
    <div className="max-w-[1200px]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold font-heading text-text-main">Group overview</h1>
          <p className="text-sm text-text-muted">Current status &middot; all figures in RWF</p>
        </div>
        <div className="flex items-center gap-4">
          <Avatar initials={displayInitials} className="bg-brand-green text-white" />
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-brand-green rounded-xl p-5 shadow-sm text-white flex flex-col justify-between h-32">
          <div className="text-[11px] font-bold tracking-wider uppercase opacity-90">Total Fund Value</div>
          <div>
            <div className="text-3xl font-bold font-heading mb-1">{formatNumber(dashData.availableBalance || 0)}</div>
            <div className="text-xs opacity-90">Contributions + penalties - withdrawals</div>
          </div>
        </div>
        
        <div className="bg-white border border-border-warm rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
          <div className="text-[11px] font-bold tracking-wider uppercase text-text-muted">Total Contributions</div>
          <div>
            <div className="text-3xl font-bold font-heading text-text-main mb-1">{formatNumber(dashData.totalContributionsAmount || 0)}</div>
            <div className="text-xs text-text-muted">All approved contributions</div>
          </div>
        </div>

        <div className="bg-white border border-border-warm rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
          <div className="text-[11px] font-bold tracking-wider uppercase text-text-muted">Total Withdrawals</div>
          <div>
            <div className="text-3xl font-bold font-heading text-text-main mb-1">{formatNumber(dashData.totalWithdrawalsCurrentMonth || 0)}</div>
            <div className="text-xs text-text-muted">Current Month</div>
          </div>
        </div>
      </div>

      {/* Row 2: 4 smaller cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border-warm rounded-xl p-4 shadow-sm flex flex-col justify-between h-24">
          <div className="text-[10px] font-bold tracking-wider uppercase text-text-muted">Members</div>
          <div>
            <div className="text-xl font-bold font-heading text-text-main mb-0.5">{dashData.totalActiveMembers || 0}</div>
            <div className="text-xs text-text-muted">all active</div>
          </div>
        </div>

        <div className="bg-terracotta-tint border border-terracotta/30 rounded-xl p-4 shadow-sm flex flex-col justify-between h-24">
          <div className="text-[10px] font-bold tracking-wider uppercase text-terracotta">Pending Approvals</div>
          <div>
            <div className="text-xl font-bold font-heading text-terracotta mb-0.5">{pendingApprovalsCount}</div>
            <div className="text-xs text-terracotta/80">awaiting your review</div>
          </div>
        </div>

        <div className="bg-white border border-border-warm rounded-xl p-4 shadow-sm flex flex-col justify-between h-24">
          <div className="text-[10px] font-bold tracking-wider uppercase text-text-muted">Unpaid Penalties</div>
          <div>
            <div className="text-xl font-bold font-heading text-text-main mb-0.5">{formatNumber(dashData.unpaidPenaltiesAmount || 0)}</div>
            <div className="text-xs text-text-muted">of {formatNumber(dashData.totalPenaltiesGenerated || 0)} generated</div>
          </div>
        </div>

        <div className="bg-white border border-border-warm rounded-xl p-4 shadow-sm flex flex-col justify-between h-24">
          <div className="text-[10px] font-bold tracking-wider uppercase text-text-muted">Collection Rate</div>
          <div>
            <div className="text-xl font-bold font-heading text-text-main mb-0.5">{collectionRate}%</div>
            <div className="text-xs text-text-muted">{dashData.paidObligationsCurrentMonth || 0} of {dashData.totalObligationsCurrentMonth || 0} paid on time</div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Charts and Approvals list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side: Charts & list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border-warm rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-semibold text-text-main text-sm">Contributions vs withdrawals</h3>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-green"></span> In</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-terracotta"></span> Out</span>
              </div>
            </div>
            
            {/* Bar chart matching screenshot */}
            <div className="h-40 flex items-end justify-between px-2 gap-4">
              {[
                { m: 'Jan', in: 95, out: 5 },
                { m: 'Feb', in: 98, out: 0 },
                { m: 'Mar', in: 90, out: 45 },
                { m: 'Apr', in: 95, out: 5 },
                { m: 'May', in: 90, out: 0 },
                { m: 'Jun', in: 85, out: 70 },
              ].map(col => (
                <div key={col.m} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                  <div className="flex items-end gap-1 w-full justify-center h-full pb-6">
                    <div className="w-3 sm:w-5 bg-brand-green rounded-t-sm" style={{ height: `${col.in}%` }}></div>
                    <div className="w-3 sm:w-5 bg-terracotta rounded-t-sm" style={{ height: `${col.out}%` }}></div>
                  </div>
                  <span className="text-[10px] text-text-muted absolute bottom-0">{col.m}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border-warm rounded-xl p-0 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border-warm">
              <h3 className="font-semibold text-text-main text-sm">Pending approvals</h3>
              <button className="text-xs font-semibold text-brand-green hover:underline">Review all &rarr;</button>
            </div>
            {/* Real Pending approvals list */}
            <div className="divide-y divide-border-warm">
              {pendingList.length > 0 ? pendingList.map((app, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-black/5 transition-colors text-sm">
                  <div className="flex items-center gap-3 w-1/3">
                    <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold ${app.type === 'Penalty' ? 'bg-terracotta' : 'bg-brand-green'}`}>
                      {getInitials(app.memberName)}
                    </div>
                    <span className="font-medium text-text-main truncate">{app.memberName || 'Unknown Member'}</span>
                  </div>
                  <div className="text-text-main text-right w-1/5">{formatNumber(app.amount)} RWF</div>
                  <div className="text-text-muted w-1/4 text-center text-xs">{app.type}</div>
                  <div className="text-text-muted text-right w-1/5 text-xs">{timeAgo(app.paymentDate as unknown as string)}</div>
                </div>
              )) : (
                <div className="p-8 text-center text-text-muted text-sm">No pending approvals at this time.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right side: On-time collection pie chart */}
        <div>
          <div className="bg-white border border-border-warm rounded-xl p-6 shadow-sm h-full flex flex-col">
            <h3 className="font-semibold text-text-main text-sm mb-8">On-time collection</h3>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* CSS Donut Chart */}
              <div className="relative w-40 h-40 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#276646 0% ${collectionRate}%, #E5E5E5 ${collectionRate}% 100%)` }}>
                <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-heading text-text-main">{collectionRate}%</span>
                  <span className="text-[10px] text-text-muted">on time</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-warm">
              <div className="text-center">
                <div className="text-lg font-bold text-brand-green mb-0.5">{dashData.paidObligationsCurrentMonth || 0}</div>
                <div className="text-[10px] tracking-wider uppercase text-text-muted">paid</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-terracotta mb-0.5">{(dashData.totalObligationsCurrentMonth || 0) - (dashData.paidObligationsCurrentMonth || 0)}</div>
                <div className="text-[10px] tracking-wider uppercase text-text-muted">late / unpaid</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
