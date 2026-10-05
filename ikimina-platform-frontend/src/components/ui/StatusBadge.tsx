export type StatusType = 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Unpaid'

interface StatusBadgeProps {
  status: StatusType
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<StatusType, { bg: string; text: string; dot: string }> = {
    Pending: { bg: 'bg-amber-tint', text: 'text-amber-700', dot: 'bg-amber' },
    Approved: { bg: 'bg-green-tint', text: 'text-green-700', dot: 'bg-green-accent' },
    Paid: { bg: 'bg-green-tint', text: 'text-green-700', dot: 'bg-green-accent' },
    Rejected: { bg: 'bg-terracotta-tint', text: 'text-terracotta', dot: 'bg-terracotta' },
    Unpaid: { bg: 'bg-terracotta-tint', text: 'text-terracotta', dot: 'bg-terracotta' }
  }

  const { bg, text, dot } = styles[status] || styles.Pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {status}
    </span>
  )
}
