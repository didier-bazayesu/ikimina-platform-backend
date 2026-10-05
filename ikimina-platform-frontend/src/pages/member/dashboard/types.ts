export interface ChartEntry {
  monthLabel: string
  status: 'PAID' | 'MISSED' | 'NONE'
  amount: number
}

export interface CatchUpObligation {
  obligationId: string
  monthLabel: string
  dueDate: string // e.g. "Overdue since 7 Apr"
  amount: number
  penaltyAmount: number | null
}

export interface DashboardViewModel {
  firstName: string
  asOf: string
  totalShares: number
  totalMonths: number
  sinceLabel: string
  shareAmount: number
  totalContributed: number
  unpaidPenaltyAmount: number
  unpaidPenaltyCount: number
  missingMonthsCount: number
  missingMonthsLabel: string
  chart: ChartEntry[]
  penaltySummary: {
    generated: number
    paid: number
    unpaid: number
  }
  catchUp: CatchUpObligation[]
}
