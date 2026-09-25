import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { formatNumber } from '../../../lib/format'
import type { DashboardViewModel } from './types'

interface Props {
  data: DashboardViewModel
}

export function MonthsToCatchUp({ data }: Props) {
  const { catchUp } = data

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border-warm bg-cream/30 gap-2">
        <h3 className="font-semibold text-text-main text-sm">Months to catch up</h3>
        <span className="text-xs text-text-muted font-medium">Allocated oldest-first</span>
      </div>
      
      {catchUp.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-brand-green font-medium">You're all caught up</p>
          <p className="text-sm text-text-muted mt-1">No missed contributions to settle.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border-warm">
          {catchUp.map((item) => (
            <li key={item.obligationId} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-terracotta-tint text-terracotta border border-terracotta/10 shrink-0 text-center uppercase leading-none font-bold">
                  <span className="text-[10px] tracking-wider">{item.monthLabel.substring(0, 3)}</span>
                  <span className="text-xs">{item.monthLabel.substring(item.monthLabel.length - 2)}</span>
                </div>
                <div>
                  <div className="font-semibold text-text-main text-sm">{item.monthLabel}</div>
                  <div className="text-xs text-text-muted mt-0.5">{item.dueDate}</div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                <div className="text-sm font-medium text-text-main">
                  {formatNumber(item.amount)}
                  {item.penaltyAmount && (
                    <span className="text-terracotta ml-1">
                      + {formatNumber(item.penaltyAmount)}
                    </span>
                  )}
                </div>
                <Link to={`/member/contribute?obligation=${item.obligationId}`}>
                  <Button variant="soft-green" size="sm">
                    Pay now
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
