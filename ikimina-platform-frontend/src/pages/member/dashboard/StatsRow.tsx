import { StatCard } from '../../../components/ui/StatCard'
import { formatNumber } from '../../../lib/format'
import type { DashboardViewModel } from './types'

interface Props {
  data: DashboardViewModel
}

export function StatsRow({ data }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="TOTAL SHARES"
        value={data.totalShares.toString()}
        caption={`of ${data.totalMonths} months · ${data.sinceLabel}`}
      />
      <StatCard
        label="TOTAL CONTRIBUTED"
        value={formatNumber(data.totalContributed)}
        unit="RWF"
        caption={`${data.totalShares} shares × ${formatNumber(data.shareAmount)}`}
      />
      <StatCard
        label="UNPAID PENALTY"
        value={formatNumber(data.unpaidPenaltyAmount)}
        unit="RWF"
        caption={`${data.unpaidPenaltyCount} penalties outstanding`}
        tone={data.unpaidPenaltyCount > 0 ? 'danger' : 'default'}
      />
      <StatCard
        label="MISSING MONTHS"
        value={data.missingMonthsCount.toString()}
        caption={data.missingMonthsLabel || 'Up to date'}
      />
    </div>
  )
}
