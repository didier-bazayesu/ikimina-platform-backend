import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { formatNumber } from '../../../lib/format'
import type { DashboardViewModel } from './types'

interface Props {
  data: DashboardViewModel
}

export function PenaltySummary({ data }: Props) {
  const { generated, paid, unpaid } = data.penaltySummary
  
  const paidPct = generated > 0 ? (paid / generated) * 100 : 0
  const unpaidPct = generated > 0 ? (unpaid / generated) * 100 : 0

  return (
    <Card className="p-5 h-full flex flex-col">
      <h3 className="font-semibold text-text-main text-sm mb-6">Penalty summary</h3>
      
      <div className="space-y-4 mb-6 flex-1">
        <div>
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-text-muted">Generated</span>
            <span className="text-text-main">{formatNumber(generated)}</span>
          </div>
          <div className="w-full h-1 bg-border-warm rounded-full overflow-hidden">
            <div className="h-full bg-border-warm w-full" />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-text-muted">Paid</span>
            <span className="text-brand-green">{formatNumber(paid)}</span>
          </div>
          <div className="w-full h-1 bg-border-warm rounded-full overflow-hidden">
            <div className="h-full bg-brand-green" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-text-muted">Unpaid</span>
            <span className="text-terracotta">{formatNumber(unpaid)}</span>
          </div>
          <div className="w-full h-1 bg-border-warm rounded-full overflow-hidden">
            <div className="h-full bg-terracotta" style={{ width: `${unpaidPct}%` }} />
          </div>
        </div>
      </div>

      {unpaid > 0 && (
        <Link to="/member/contribute?penalty=1" className="block mt-auto">
          <Button variant="soft-terracotta" className="w-full">
            Settle penalty
          </Button>
        </Link>
      )}
    </Card>
  )
}
