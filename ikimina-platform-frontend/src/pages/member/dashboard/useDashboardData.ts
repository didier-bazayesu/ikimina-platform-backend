import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { DashboardViewModel, CatchUpObligation, ChartEntry } from './types'
import { useCurrentMember } from '../useCurrentMember'

interface DashboardAPIResponse {
  totalApprovedContributions: number
  totalApprovedPenalties: number
  outstandingObligationsCount: number
  outstandingObligationsAmount: number
  unpaidPenaltiesAmount: number
}

interface ObligationAPI {
  id: string
  month: number
  year: number
  expectedAmount: number
  status: 'PAID' | 'UNPAID'
  isOverdue: boolean
}

interface PenaltyAPI {
  id: string
  monthlyObligationId: string
  amount: number
  status: 'PAID' | 'UNPAID' | 'WAIVED'
}

interface SystemSettingsAPI {
  monthlyShareAmount: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function useDashboardData() {
  const { firstName, joinedDate } = useCurrentMember()

  return useQuery<DashboardViewModel>({
    queryKey: ['memberDashboardData'],
    queryFn: async () => {
      // 1. Fetch all required data in parallel, using Promise.allSettled to handle failures gracefully
      const results = await Promise.allSettled([
        api.get<DashboardAPIResponse>('/dashboards/member'),
        api.get<{ items: ObligationAPI[] }>('/monthly-obligations/me'),
        api.get<{ items: PenaltyAPI[] }>('/penalties/me?limit=100')
      ])

      const dashRes = results[0].status === 'fulfilled' ? results[0].value : { data: { totalApprovedContributions: 0, totalApprovedPenalties: 0, outstandingObligationsCount: 0, outstandingObligationsAmount: 0, unpaidPenaltiesAmount: 0 } }
      const obsRes = results[1].status === 'fulfilled' ? results[1].value : { data: { items: [] } }
      const penRes = results[2].status === 'fulfilled' ? results[2].value : { data: { items: [] } }

      const dash = dashRes.data || (dashRes as any) // Handle double unwrap if needed
      const obligations = obsRes.data?.items || (obsRes as any)?.items || []
      const penalties = penRes.data?.items || (penRes as any)?.items || []

      // Derive the share amount from the member's obligations instead of hardcoding
      const shareAmount = obligations.length > 0 ? obligations[0].expectedAmount : 20000

      // 2. Compute missing months
      const unpaidObligations = obligations.filter(o => o.status === 'UNPAID' && o.isOverdue)
      unpaidObligations.sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })
      
      let missingMonthsLabel = ''
      if (unpaidObligations.length > 0) {
        missingMonthsLabel = unpaidObligations.map(o => `${MONTH_NAMES[o.month - 1]} ${o.year}`).join(' · ')
      }

      // 3. Compute catchUp array
      const catchUp: CatchUpObligation[] = unpaidObligations.map(obs => {
        const obsPenalties = penalties.filter(p => p.monthlyObligationId === obs.id && p.status === 'UNPAID')
        const totalPenalty = obsPenalties.reduce((sum, p) => sum + p.amount, 0)
        return {
          obligationId: obs.id,
          monthLabel: `${MONTH_NAMES[obs.month - 1]} ${obs.year}`,
          dueDate: `Overdue · ${totalPenalty > 0 ? 'penalty applied' : 'no penalty yet'}`,
          amount: obs.expectedAmount,
          penaltyAmount: totalPenalty > 0 ? totalPenalty : null
        }
      })

      // 4. Compute chart (last 12 months up to current month)
      const chart: ChartEntry[] = []
      const now = new Date()
      let currentMonth = now.getMonth() + 1
      let currentYear = now.getFullYear()
      
      for (let i = 11; i >= 0; i--) {
        let m = currentMonth - i
        let y = currentYear
        if (m <= 0) {
          m += 12
          y -= 1
        }
        
        const obs = obligations.find(o => o.month === m && o.year === y)
        let status: 'NONE' | 'PAID' | 'MISSED' = 'NONE'
        if (obs) {
          status = obs.status === 'PAID' ? 'PAID' : (obs.isOverdue ? 'MISSED' : 'NONE')
        }

        chart.push({
          monthLabel: MONTH_NAMES[m - 1],
          status,
          amount: obs?.expectedAmount || 0
        })
      }

      // 5. Generate since label
      let sinceLabel = ''
      if (joinedDate) {
        const jd = new Date(joinedDate)
        sinceLabel = `since ${MONTH_NAMES[jd.getMonth()]} ${jd.getFullYear()}`
      }

      const generatedPenalties = dash.unpaidPenaltiesAmount + dash.totalApprovedPenalties

      return {
        firstName: firstName || 'Member',
        asOf: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(now),
        totalShares: Math.floor(dash.totalApprovedContributions / shareAmount),
        totalMonths: obligations.length,
        sinceLabel,
        shareAmount,
        totalContributed: dash.totalApprovedContributions,
        unpaidPenaltyAmount: dash.unpaidPenaltiesAmount,
        unpaidPenaltyCount: penalties.filter(p => p.status === 'UNPAID').length,
        missingMonthsCount: dash.outstandingObligationsCount,
        missingMonthsLabel,
        chart,
        penaltySummary: {
          generated: generatedPenalties,
          paid: dash.totalApprovedPenalties,
          unpaid: dash.unpaidPenaltiesAmount
        },
        catchUp
      }
    }
  })
}
