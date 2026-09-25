import { DashboardHeader } from './dashboard/DashboardHeader'
import { StatsRow } from './dashboard/StatsRow'
import { ContributionsChart } from './dashboard/ContributionsChart'
import { PenaltySummary } from './dashboard/PenaltySummary'
import { MonthsToCatchUp } from './dashboard/MonthsToCatchUp'
import { useDashboardData } from './dashboard/useDashboardData'
import { Button } from '../../components/ui/Button'

export function MemberDashboardPage() {
  const { data: dashboard, isLoading, error } = useDashboardData()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-terracotta font-medium mb-4">Failed to load dashboard data. Please try again.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (isLoading || !dashboard) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-8 bg-black/5 rounded w-48"></div>
            <div className="h-4 bg-black/5 rounded w-64"></div>
          </div>
          <div className="h-10 bg-black/5 rounded w-40"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-black/5 rounded-xl"></div>
          <div className="h-28 bg-black/5 rounded-xl"></div>
          <div className="h-28 bg-black/5 rounded-xl"></div>
          <div className="h-28 bg-black/5 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-black/5 rounded-xl"></div>
          <div className="h-64 bg-black/5 rounded-xl"></div>
        </div>
        <div className="h-48 bg-black/5 rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <DashboardHeader data={dashboard} />
      <StatsRow data={dashboard} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ContributionsChart data={dashboard} />
        </div>
        <div>
          <PenaltySummary data={dashboard} />
        </div>
      </div>
      <MonthsToCatchUp data={dashboard} />
    </div>
  )
}
