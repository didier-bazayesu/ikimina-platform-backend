import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import type { DashboardViewModel } from './types'

interface Props {
  data: DashboardViewModel
}

export function DashboardHeader({ data }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-main tracking-tight">
          Welcome back, {data.firstName}
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Your savings standing as of {data.asOf}.
        </p>
      </div>
      <Link to="/member/contribute">
        <Button className="w-full sm:w-auto" variant="primary">
          + Record a contribution
        </Button>
      </Link>
    </div>
  )
}
