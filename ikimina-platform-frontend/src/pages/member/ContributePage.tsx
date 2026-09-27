import { useState, useRef } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { formatNumber } from '../../lib/format'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useNavigate } from 'react-router-dom'

interface ObligationAPI {
  id: string
  month: number
  year: number
  expectedAmount: number
  status: 'PAID' | 'UNPAID'
  isOverdue: boolean
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ContributePage() {
  const navigate = useNavigate()
  const [paymentMode, setPaymentMode] = useState<'CONTRIBUTION' | 'BOTH' | 'PENALTY_ONLY'>('CONTRIBUTION')
  const [amount, setAmount] = useState('20000')
  const [monthsCountState, setMonthsCountState] = useState(1)
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('MOMO')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch unpaid obligations to allocate
  const { data: obligationsData } = useQuery({
    queryKey: ['unpaidObligations'],
    queryFn: async () => {
      const res = await api.get<{ items: ObligationAPI[] }>('/monthly-obligations/me')
      const items = res.data?.items || (res as any).items || []
      return items.filter(o => o.status === 'UNPAID').sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })
    }
  })

  // Fetch unpaid penalties to allocate
  const { data: penaltiesData } = useQuery({
    queryKey: ['unpaidPenalties'],
    queryFn: async () => {
      const res = await api.get<{ items: any[] }>('/penalties/me')
      const items = res.data?.items || (res as any).items || []
      return items.filter(p => p.status === 'UNPAID').sort((a, b) => {
        if (a.year === b.year) return a.month - b.month
        return a.year - b.year
      })
    }
  })

  const unpaidObligations = obligationsData || []
  
  // Calculate effective months count
  const monthsCount = paymentMode === 'PENALTY_ONLY' ? 0 : monthsCountState
  const allocatedObligations = unpaidObligations.slice(0, monthsCount)

  const unpaidPenalties = penaltiesData || []
  
  const shareAmount = unpaidObligations.length > 0 ? unpaidObligations[0].expectedAmount : 20000
  const expectedContribution = monthsCount * shareAmount
  
  // Calculate suggested penalty based on actual unpaid penalties
  const suggestedPenalty = unpaidPenalties.reduce((sum, p) => sum + p.amount, 0)

  const actualAmount = paymentMode === 'PENALTY_ONLY' ? 0 : (parseInt(amount) || 0)
  const actualPenalty = paymentMode === 'CONTRIBUTION' ? 0 : (parseInt(penaltyAmount) || 0)
  const total = actualAmount + actualPenalty

  const amountMatches = actualAmount === expectedContribution

  const submitMutation = useMutation({
    mutationFn: async () => {
      const promises = []

      // 1. Submit contribution payment if there are obligations allocated
      if (paymentMode !== 'PENALTY_ONLY' && allocatedObligations.length > 0 && actualAmount > 0) {
        const formData = new FormData()
        formData.append('amount', actualAmount.toString())
        formData.append('paymentDate', new Date(paymentDate).toISOString())
        formData.append('method', method)
        if (reference) formData.append('reference', reference)
        if (notes) formData.append('notes', notes)
        if (file) formData.append('proof', file)
        
        allocatedObligations.forEach(obs => {
          formData.append('obligationIds[]', obs.id)
        })

        promises.push(
          api.post('/contribution-payments', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        )
      }

      // 2. Submit penalty payments for each unpaid penalty (distributing actualPenalty)
      if (paymentMode !== 'CONTRIBUTION' && unpaidPenalties.length > 0 && actualPenalty > 0) {
        let remainingPenalty = actualPenalty
        for (const p of unpaidPenalties) {
          if (remainingPenalty <= 0) break
          
          const payAmount = Math.min(p.amount, remainingPenalty)
          const pForm = new FormData()
          // Based on the dual submission discussion, we use penaltyIds[] or penaltyId
          // I will use penaltyId as per the existing code's logic
          pForm.append('penaltyId', p.id) 
          pForm.append('amount', payAmount.toString())
          pForm.append('paymentDate', new Date(paymentDate).toISOString())
          pForm.append('method', method)
          if (reference) pForm.append('reference', reference)
          if (notes) pForm.append('notes', notes)
          if (file) pForm.append('proof', file)

          promises.push(
            api.post('/penalty-payments', pForm, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          )

          remainingPenalty -= payAmount
        }
      }

      await Promise.all(promises)
    },
    onSuccess: () => {
      navigate('/member')
    },
    onError: (error) => {
      console.error('Submission failed', error)
      alert('Failed to submit payment. Please check your inputs.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      alert('Proof of payment is required.')
      return
    }
    if (paymentMode !== 'PENALTY_ONLY' && allocatedObligations.length === 0) {
      alert('No obligations available to pay.')
      return
    }
    if (paymentMode === 'PENALTY_ONLY' && unpaidPenalties.length === 0) {
      alert('No unpaid penalties available to pay.')
      return
    }
    if (method !== 'CASH' && !reference.trim()) {
      alert('Reference number is required for ' + method)
      return
    }
    submitMutation.mutate()
  }

  return (
    <div className="max-w-5xl mx-auto font-body">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading text-text-main tracking-tight mb-2">Record a payment</h1>
        <p className="text-text-muted text-sm">
          {paymentMode === 'CONTRIBUTION'
            ? "Paying on time or ahead of the 7th — no penalty applies."
            : "Log a transfer you've already made and attach proof. The treasurer reviews and approves it."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Form */}
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-card border border-border-warm p-6 md:p-8 space-y-8">
            
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-text-main">What are you paying for?</label>
              <div className="flex p-1 bg-cream/50 border border-border-warm rounded-lg w-full">
                <button
                  type="button"
                  onClick={() => setPaymentMode('CONTRIBUTION')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${paymentMode === 'CONTRIBUTION' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
                >
                  Contribution
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('BOTH')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${paymentMode === 'BOTH' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
                >
                  Contr. + Penalty
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('PENALTY_ONLY')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${paymentMode === 'PENALTY_ONLY' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
                >
                  Penalty Only
                </button>
              </div>
            </div>

            {paymentMode !== 'PENALTY_ONLY' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text-main">Contribution amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-border-warm px-4 py-2.5 pr-12 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">RWF</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text-main">Number of months</label>
                  <div className="flex items-center border border-border-warm rounded-lg overflow-hidden h-[42px]">
                    <button type="button" onClick={() => setMonthsCountState(Math.max(1, monthsCountState - 1))} className="px-4 text-text-muted hover:bg-black/5 h-full flex items-center justify-center border-r border-border-warm">&minus;</button>
                    <input
                      type="number"
                      value={monthsCountState}
                      onChange={(e) => setMonthsCountState(parseInt(e.target.value) || 1)}
                      className="flex-1 w-full text-center outline-none bg-transparent"
                    />
                    <button type="button" onClick={() => setMonthsCountState(monthsCountState + 1)} className="px-4 text-text-muted hover:bg-black/5 h-full flex items-center justify-center border-l border-border-warm">+</button>
                  </div>
                </div>
              </div>
            )}

            {paymentMode !== 'PENALTY_ONLY' && (
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="block text-sm font-semibold text-text-main">Months covered</label>
                  <span className="text-xs text-text-muted font-medium">
                    {paymentMode === 'BOTH' ? 'Auto-allocated oldest unpaid first' : 'Paying ahead is allowed'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paymentMode === 'BOTH' ? (
                    <>
                      <div className="px-3 py-1.5 bg-green-tint text-brand-green border border-brand-green/30 rounded-md text-sm font-medium flex items-center gap-1.5 cursor-default">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Apr 2026
                      </div>
                      <div className="px-3 py-1.5 bg-green-tint text-brand-green border border-brand-green/30 rounded-md text-sm font-medium flex items-center gap-1.5 cursor-default">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        May 2026
                      </div>
                      <div className="px-3 py-1.5 bg-surface text-text-muted border border-border-warm rounded-md text-sm font-medium cursor-pointer hover:bg-black/5">Jul 2026</div>
                      <div className="px-3 py-1.5 bg-surface text-text-muted border border-border-warm rounded-md text-sm font-medium cursor-pointer hover:bg-black/5">Aug 2026</div>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-1.5 bg-green-tint text-brand-green border border-brand-green/30 rounded-md text-sm font-medium flex items-center gap-1.5 cursor-default">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Jul 2026
                      </div>
                      <div className="px-3 py-1.5 bg-surface text-text-muted border border-border-warm rounded-md text-sm font-medium cursor-pointer hover:bg-black/5">Aug 2026</div>
                      <div className="px-3 py-1.5 bg-surface text-text-muted border border-border-warm rounded-md text-sm font-medium cursor-pointer hover:bg-black/5">Sep 2026</div>
                    </>
                  )}
                  <div className="px-3 py-1.5 bg-surface text-text-muted border border-border-warm rounded-md text-sm font-medium cursor-pointer hover:bg-black/5">+ advance</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">Penalty amount</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={paymentMode === 'CONTRIBUTION'}
                    value={paymentMode !== 'CONTRIBUTION' ? penaltyAmount : ''}
                    placeholder={paymentMode !== 'CONTRIBUTION' ? '' : 'Not applicable'}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    className="w-full rounded-lg border border-border-warm px-4 py-2.5 pr-12 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none disabled:bg-cream/50 disabled:text-text-muted"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">RWF</span>
                </div>
                {paymentMode !== 'CONTRIBUTION' ? (
                  <p className="text-xs text-text-muted mt-1">
                    {unpaidPenalties.length > 0 
                      ? `System suggests ${suggestedPenalty.toLocaleString()} for ${unpaidPenalties.length} overdue months`
                      : 'No overdue penalties to pay'}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted mt-1">No overdue months — nothing owed</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">Date of payment</label>
                <div className="relative">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-lg border border-border-warm px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">Payment method</label>
                <div className="relative">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-lg border border-border-warm px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none bg-surface"
                  >
                    <option value="MOMO">Mobile Money (MoMo)</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">Reference number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={method === 'MOMO' ? "e.g. 1234567890" : "Transaction ID"}
                    required={method !== 'CASH'}
                    className="w-full rounded-lg border border-border-warm px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-main">Proof of payment</label>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".jpg,.jpeg,.png,.pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-warm rounded-xl p-8 flex flex-col items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0tMSwxIGwyLC0yCiAgICAgICAgIE0wLDQgbDQsLTQKICAgICAgICAgTTMsNSBsMiwtMiIgc3Ryb2tlPSIjZjVmNWY1IiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] bg-repeat cursor-pointer hover:border-brand-green/50 transition-colors"
              >
                <div className="w-10 h-10 bg-surface border border-border-warm rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-text-main mb-1">
                  {file ? file.name : "Drop your SMS screenshot or bank slip"}
                </p>
                <p className="text-xs text-text-muted font-mono tracking-wide">JPG &middot; PNG &middot; PDF &mdash; max 5 MB &middot; required</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-main">Notes <span className="text-text-muted font-normal">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border-warm px-4 py-3 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none resize-none text-sm"
                placeholder="Add any additional details about this payment"
              />
            </div>

            <div className="pt-4 border-t border-border-warm flex flex-col sm:flex-row gap-4">
              <Button type="submit" variant="primary" className="w-full sm:w-auto px-8">Submit for approval</Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">Save draft</Button>
            </div>
          </form>
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[320px] shrink-0">
          <Card className="p-6 sticky top-8">
            <h3 className="font-semibold text-text-main mb-6">Summary</h3>
            
            <div className="space-y-4 text-sm mb-6 border-b border-border-warm pb-6">
              {paymentMode !== 'PENALTY_ONLY' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Months covered</span>
                    <span className="font-medium text-text-main">{monthsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Contribution</span>
                    <span className="font-medium text-text-main">{formatNumber(actualAmount)} RWF</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Penalty</span>
                {paymentMode !== 'CONTRIBUTION' ? (
                  <span className="font-medium text-terracotta">{formatNumber(actualPenalty)} RWF</span>
                ) : (
                  <span className="font-medium text-brand-green">None</span>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-text-muted mb-1">Total to record</div>
              <div className="text-3xl font-bold font-heading text-text-main tracking-tight">
                {formatNumber(total)}
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="text-[10px] font-bold text-text-muted tracking-wider uppercase">Allocated to</div>
              <div className="flex flex-wrap gap-2">
                {paymentMode !== 'CONTRIBUTION' ? (
                  <>
                    <span className="px-2.5 py-1 bg-cream border border-border-warm rounded text-xs font-medium text-text-main">Apr 2026 (Penalty)</span>
                    {paymentMode === 'BOTH' && (
                      <span className="px-2.5 py-1 bg-cream border border-border-warm rounded text-xs font-medium text-text-main">May 2026</span>
                    )}
                  </>
                ) : (
                  <span className="px-2.5 py-1 bg-cream border border-border-warm rounded text-xs font-medium text-text-main flex items-center gap-1.5">
                    Jul 2026 <span className="text-[10px] font-bold text-brand-green tracking-wider">ADVANCE</span>
                  </span>
                )}
              </div>
            </div>

            {paymentMode !== 'CONTRIBUTION' ? (
              paymentMode === 'BOTH' && amountMatches ? (
                <div className="bg-green-tint border border-brand-green/30 rounded-lg p-3 flex items-start gap-2 mb-6">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green shrink-0 mt-0.5"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-xs font-medium text-brand-green">Amount matches {monthsCount} &times; {formatNumber(shareAmount)}</span>
                </div>
              ) : paymentMode === 'BOTH' && !amountMatches ? (
                <div className="bg-terracotta-tint border border-terracotta/30 rounded-lg p-3 flex items-start gap-2 mb-6">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-terracotta shrink-0 mt-0.5"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><circle cx="12" cy="12" r="10"></circle></svg>
                  <span className="text-xs font-medium text-terracotta">Amount does not match expected {formatNumber(expectedContribution)}</span>
                </div>
              ) : null
            ) : (
              <div className="bg-green-tint border border-brand-green/30 rounded-lg p-3 flex items-start gap-2 mb-6">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green shrink-0 mt-0.5"><path d="M20 6L9 17l-5-5"/></svg>
                <span className="text-xs font-medium text-brand-green">Paid ahead of the 7th — no penalty</span>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-text-muted">
              {paymentMode !== 'CONTRIBUTION' ? (
                <>This is recorded as <strong>Pending</strong> until the treasurer verifies your proof.</>
              ) : (
                <>Covering a future month in advance keeps it penalty-free even if you're away when its due date arrives.</>
              )}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

