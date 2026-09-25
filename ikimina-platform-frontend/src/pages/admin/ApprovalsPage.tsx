import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatNumber, formatDate } from '../../lib/format'
import { Avatar } from '../../components/ui/Avatar'

// ─── Types matching actual backend shapes ─────────────────────────────────────

interface ContribPayment {
  id: string
  memberId: string
  amount: number
  paymentDate: string
  method: string
  reference?: string
  notes?: string
  proofUrl: string
  status: string
  createdAt: string
  memberNumber?: string
  memberName?: string
  allocations?: {
    id: string
    amount: number        // what was allocated (paid into this obligation)
    month?: number
    year?: number
  }[]
}

interface PenPayment {
  id: string
  penaltyId: string
  amount: number
  paymentDate: string
  method: string
  reference?: string
  notes?: string
  proofUrl: string
  status: string
  createdAt: string
  memberNumber?: string
  memberName?: string
}

type Card = {
  key: string
  memberName: string
  memberNumber: string
  paymentDate: string
  method: string
  proofUrl: string
  status: string
  contribution?: ContribPayment
  penalty?: PenPayment
  totalAmount: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Convert an absolute backend URL (http://localhost:3000/uploads/...) 
// to a relative path (/uploads/...) so Vite's proxy can serve it.
function toRelativeUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url // already relative
  }
}

function buildCards(contribs: ContribPayment[], penalties: PenPayment[]): Card[] {
  const map = new Map<string, Card>()

  contribs.forEach(c => {
    const k = `${c.memberName ?? c.memberId}|${c.proofUrl}`
    map.set(k, {
      key: k,
      memberName: c.memberName ?? 'Unknown',
      memberNumber: c.memberNumber ?? '',
      paymentDate: c.paymentDate,
      method: c.method,
      proofUrl: toRelativeUrl(c.proofUrl),
      status: c.status,
      contribution: c,
      totalAmount: Number(c.amount),
    })
  })

  penalties.forEach(p => {
    const k = `${p.memberName ?? p.penaltyId}|${p.proofUrl}`
    if (map.has(k)) {
      const card = map.get(k)!
      card.penalty = p
      card.totalAmount += Number(p.amount)
      if (p.status === 'PENDING') card.status = 'PENDING'
    } else {
      map.set(k, {
        key: k,
        memberName: p.memberName ?? 'Unknown',
        memberNumber: p.memberNumber ?? '',
        paymentDate: p.paymentDate,
        method: p.method,
        proofUrl: toRelativeUrl(p.proofUrl),
        status: p.status,
        penalty: p,
        totalAmount: Number(p.amount),
      })
    }
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')

  // Track which card is currently being acted on: { key, action }
  const [acting, setActing] = useState<{ key: string; action: 'approve' | 'reject' } | null>(null)

  // PENDING tab — only fetch pending items
  const pendingQuery = useQuery<Card[]>({
    queryKey: ['adminApprovals', 'PENDING'],
    queryFn: async () => {
      const [cRes, pRes] = await Promise.all([
        api.get('/contribution-payments?status=PENDING'),
        api.get('/penalty-payments?status=PENDING'),
      ])
      const contribs: ContribPayment[] = (cRes.data as any)?.items ?? []
      const penalties: PenPayment[] = (pRes.data as any)?.items ?? []
      return buildCards(contribs, penalties)
    },
  })

  // ALL tab — paginated, no status filter
  const allQuery = useInfiniteQuery({
    queryKey: ['adminApprovals', 'ALL'],
    queryFn: async ({ pageParam = 1 }) => {
      const [cRes, pRes] = await Promise.all([
        api.get(`/contribution-payments?page=${pageParam}`),
        api.get(`/penalty-payments?page=${pageParam}`),
      ])
      const contribs: ContribPayment[] = (cRes.data as any)?.items ?? []
      const penalties: PenPayment[] = (pRes.data as any)?.items ?? []
      const total = Math.max(
        (cRes.data as any)?.total ?? 0,
        (pRes.data as any)?.total ?? 0,
      )
      return { contribs, penalties, total, page: pageParam }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * 20
      return loaded < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled: filter === 'ALL',
  })

  const approveMutation = useMutation({
    mutationFn: async (card: Card) => {
      setActing({ key: card.key, action: 'approve' })
      const calls: Promise<any>[] = []
      if (card.contribution?.status === 'PENDING')
        calls.push(api.patch(`/contribution-payments/${card.contribution.id}/approve`))
      if (card.penalty?.status === 'PENDING')
        calls.push(api.patch(`/penalty-payments/${card.penalty.id}/approve`))
      await Promise.all(calls)
    },
    onSuccess: (_data, card) => {
      toast.success(`${card.memberName}'s payment approved!`)
      queryClient.invalidateQueries({ queryKey: ['adminApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    },
    onError: (err: any, card) => {
      toast.error(err?.message || `Failed to approve ${card.memberName}'s payment.`)
    },
    onSettled: () => setActing(null),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ card, reason }: { card: Card; reason: string }) => {
      setActing({ key: card.key, action: 'reject' })
      const calls: Promise<any>[] = []
      if (card.contribution?.status === 'PENDING')
        calls.push(api.patch(`/contribution-payments/${card.contribution.id}/reject`, { reason }))
      if (card.penalty?.status === 'PENDING')
        calls.push(api.patch(`/penalty-payments/${card.penalty.id}/reject`, { reason }))
      await Promise.all(calls)
    },
    onSuccess: (_data, { card }) => {
      toast.success(`${card.memberName}'s payment rejected.`)
      queryClient.invalidateQueries({ queryKey: ['adminApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    },
    onError: (err: any, { card }) => {
      toast.error(err?.message || `Failed to reject ${card.memberName}'s payment.`)
    },
    onSettled: () => setActing(null),
  })

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const initials = (name: string) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const timeAgo = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
    if (h < 1) return 'just now'
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
    const d = Math.floor(h / 24)
    return `${d} day${d > 1 ? 's' : ''} ago`
  }

  const formatMonths = (c: ContribPayment) => {
    const allocs = c.allocations ?? []
    if (!allocs.length) return 'N/A'
    const months = allocs
      .map(a => ({ m: a.month ?? 0, y: a.year ?? 0 }))
      .filter(a => a.m > 0)
      .sort((a, b) => a.y - b.y || a.m - b.m)
    if (!months.length) return 'N/A'
    if (months.length === 1)
      return `${MONTHS[months[0].m - 1]} ${months[0].y} (1)`
    const first = months[0]
    const last = months[months.length - 1]
    return `${MONTHS[first.m - 1]}–${MONTHS[last.m - 1]} ${last.y} (${months.length})`
  }

  // ─── Derived state ────────────────────────────────────────────────────────────

  const isLoading = filter === 'PENDING' ? pendingQuery.isLoading : allQuery.isLoading
  const pendingCards = pendingQuery.data ?? []
  
  const allCards = (() => {
    if (!allQuery.data) return []
    const allContribs = allQuery.data.pages.flatMap(p => p.contribs)
    const allPenalties = allQuery.data.pages.flatMap(p => p.penalties)
    return buildCards(allContribs, allPenalties)
  })()
  const allTotal = allQuery.data?.pages[0]?.total ?? 0

  const pendingCount = pendingCards.length
  const displayed = filter === 'PENDING' ? pendingCards : allCards
  const canLoadMore = filter === 'ALL' && allQuery.hasNextPage

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-warm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-heading text-text-main">Approvals</h1>
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-terracotta/10 text-terracotta text-xs font-bold rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center bg-white rounded-full border border-border-warm p-1 shadow-sm">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-1.5 rounded-full cursor-pointer text-sm font-bold transition-colors ${filter === 'PENDING' ? 'bg-text-main text-white' : 'text-text-muted hover:text-text-main'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-full cursor-pointer text-sm font-bold transition-colors ${filter === 'ALL' ? 'bg-text-main text-white' : 'text-text-muted hover:text-text-main'}`}
          >
            All
          </button>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="animate-pulse h-48 bg-white rounded-xl border border-border-warm" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-text-muted border border-border-warm">
          No {filter === 'PENDING' ? 'pending' : ''} approvals found.
        </div>
      ) : (
        <div className="space-y-6">
          {displayed.map(card => {
            const hasContrib = !!card.contribution
            const hasPenalty = !!card.penalty
            const typeLabel = hasContrib && hasPenalty
              ? 'Contribution + penalty'
              : hasContrib ? 'Contribution, no penalty'
              : 'Penalty only'

            const proofIsImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(card.proofUrl ?? '')
            const penaltyAmount = hasPenalty ? Number(card.penalty!.amount) : 0

            // Verification: declared total vs expected (contrib × months + penalty)
            // We know the declared contribution from allocations sum
            const allocTotal = (card.contribution?.allocations ?? [])
              .reduce((s, a) => s + Number(a.amount), 0)
            const declaredOk = allocTotal > 0 && card.totalAmount > 0
            const matches = declaredOk && card.totalAmount >= allocTotal + penaltyAmount

            return (
              <div key={card.key} className="bg-white rounded-xl border border-border-warm p-6 shadow-sm">
                {/* Top row */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Avatar initials={initials(card.memberName)} className="w-12 h-12 text-lg bg-indigo-500 text-white" />
                    <div>
                      <h3 className="font-bold text-text-main text-lg leading-tight">{card.memberName}</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Member #{card.memberNumber} &middot; submitted {timeAgo(card.contribution?.createdAt ?? card.penalty?.createdAt ?? card.paymentDate)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    card.status === 'PENDING' ? 'bg-orange-100 text-orange-700'
                    : card.status === 'APPROVED' ? 'bg-brand-green/10 text-brand-green'
                    : 'bg-terracotta/10 text-terracotta'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      card.status === 'PENDING' ? 'bg-orange-500'
                      : card.status === 'APPROVED' ? 'bg-brand-green'
                      : 'bg-terracotta'
                    }`} />
                    {card.status.charAt(0) + card.status.slice(1).toLowerCase()}
                  </span>
                </div>

                {/* Details + proof */}
                <div className="flex flex-col md:flex-row gap-6 mb-5">
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-text-muted mb-1">Type</p>
                      <p className="text-sm font-medium text-text-main">{typeLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-text-muted mb-1">Amount</p>
                      <p className="text-sm font-medium text-text-main">{formatNumber(card.totalAmount)} RWF</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-text-muted mb-1">Payment Date</p>
                      <p className="text-sm font-medium text-text-main">{formatDate(card.paymentDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-text-muted mb-1">Months Covered</p>
                      <p className="text-sm font-medium text-text-main">
                        {hasContrib ? formatMonths(card.contribution!) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-text-muted mb-1">Penalty Declared</p>
                      <p className="text-sm font-medium text-text-main">
                        {hasPenalty ? `${formatNumber(card.penalty!.amount)} RWF` : 'None'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-text-muted mb-1">Method</p>
                      <p className="text-sm font-medium text-text-main capitalize">{(card.method ?? '').replace(/_/g, ' ')}</p>
                    </div>
                  </div>

                  {/* Proof thumbnail */}
                  {card.proofUrl && (
                    <div className="w-full md:w-44 shrink-0 flex flex-col items-center">
                      <a href={card.proofUrl} target="_blank" rel="noreferrer" className="block w-full group">
                        <div className="w-full h-28 bg-bg-warm rounded-lg border border-border-warm overflow-hidden relative">
                          {proofIsImage ? (
                            <img src={card.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-text-muted">
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-[10px] font-medium text-center px-1 break-all leading-tight">
                                {card.proofUrl.split('/').pop()}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold rounded-lg">
                            Open
                          </div>
                        </div>
                      </a>
                      <a href={card.proofUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-green hover:underline mt-1.5">
                        View proof
                      </a>
                    </div>
                  )}
                </div>

                {/* Verification banner — only show if we have enough data */}
                {hasContrib && allocTotal > 0 && (
                  <div className={`mb-5 p-3 rounded-lg flex items-center justify-between text-sm ${
                    matches ? 'bg-brand-green/10 text-brand-green' : 'bg-terracotta/10 text-terracotta'
                  }`}>
                    <div className="flex items-center gap-2 font-medium">
                      {matches ? (
                        <>
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>System owed {formatNumber(allocTotal + penaltyAmount)} · declared {formatNumber(card.totalAmount)} — matches</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>System owes {formatNumber(allocTotal + penaltyAmount)} (incl. penalties), member declared {formatNumber(card.totalAmount)}</span>
                        </>
                      )}
                    </div>
                    {!matches && (
                      <span className="text-xs font-bold shrink-0 ml-4">{formatNumber(allocTotal + penaltyAmount - card.totalAmount)} short</span>
                    )}
                  </div>
                )}

                {/* Actions — only for pending */}
                {card.status === 'PENDING' && (() => {
                  const isApproving = acting?.key === card.key && acting.action === 'approve'
                  const isRejecting = acting?.key === card.key && acting.action === 'reject'
                  const isBusy = isApproving || isRejecting

                  return (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-warm">
                      <button
                        onClick={() => {
                          const r = window.prompt('Reason for rejection:')
                          if (r?.trim()) rejectMutation.mutate({ card, reason: r.trim() })
                        }}
                        disabled={isBusy}
                        className="px-4 py-2 rounded-lg border border-terracotta text-terracotta font-bold text-sm hover:bg-terracotta/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 min-w-[90px] justify-center"
                      >
                        {isRejecting ? (
                          <div className="w-4 h-4 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin" />
                        ) : (
                          <><span className="text-base leading-none">&times;</span> Reject</>
                        )}
                      </button>
                      <button className="px-4 py-2 rounded-lg border border-border-warm text-text-main font-bold text-sm hover:bg-black/5 transition-colors">
                        Flag &amp; message
                      </button>
                      <button
                        onClick={() => approveMutation.mutate(card)}
                        disabled={isBusy}
                        className="px-6 py-2 rounded-lg bg-brand-green text-white font-bold text-sm hover:bg-brand-green/90 transition-colors disabled:opacity-40 flex items-center gap-1.5 min-w-[110px] justify-center"
                      >
                        {isApproving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><span>✓</span> Approve</>
                        )}
                      </button>
                    </div>
                  )
                })()}
              </div>
            )
          })}

          {/* Load more — All tab only */}
          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => allQuery.fetchNextPage()}
                disabled={allQuery.isFetchingNextPage}
                className="px-6 py-2.5 rounded-xl border border-border-warm text-text-main font-bold text-sm hover:bg-black/5 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {allQuery.isFetchingNextPage ? (
                  <><div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" /> Loading…</>
                ) : `Show more (${allTotal - allCards.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
