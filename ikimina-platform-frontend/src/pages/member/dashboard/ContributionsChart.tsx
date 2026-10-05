import { Card } from '../../../components/ui/Card'
import type { DashboardViewModel } from './types'

interface Props {
  data: DashboardViewModel
}

export function ContributionsChart({ data }: Props) {
  return (
    <Card className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-semibold text-text-main text-sm">Contributions over time</h3>
        <span className="text-xs text-text-muted uppercase font-medium">Last 12 months &middot; RWF</span>
      </div>
      
      <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 mb-4 h-32">
        {data.chart.map((entry, idx) => {
          const isPaid = entry.status === 'PAID'
          const isMissed = entry.status === 'MISSED'
          
          let heightClass = 'h-0'
          if (isPaid) heightClass = 'h-full'
          if (isMissed) heightClass = 'h-1/4'

          let bgClass = 'bg-transparent'
          if (isPaid) bgClass = 'bg-brand-green'
          if (isMissed) bgClass = 'bg-terracotta-tint'

          const labelColor = isMissed ? 'text-terracotta' : 'text-text-muted'
          const ariaLabel = `${entry.monthLabel}: ${entry.status === 'NONE' ? 'Not joined' : entry.status.toLowerCase() + ' ' + entry.amount + ' RWF'}`

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative" aria-label={ariaLabel}>
              <div className="w-full bg-transparent rounded-t-sm h-full flex items-end">
                <div className={`w-full rounded-sm transition-all duration-300 ${heightClass} ${bgClass}`} />
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${labelColor}`}>
                {entry.monthLabel}
              </span>
            </div>
          )
        })}
      </div>
      
      <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border-warm/50 text-xs font-medium text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-brand-green"></span>
          <span>Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-terracotta-tint"></span>
          <span>Missed month</span>
        </div>
      </div>
    </Card>
  )
}
