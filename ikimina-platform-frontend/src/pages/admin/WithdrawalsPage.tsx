import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatNumber } from '../../lib/format'
import { format } from 'date-fns'

export function WithdrawalsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState<string>('')
  const [withdrawalDate, setWithdrawalDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState<string>('OTHER')
  const [beneficiary, setBeneficiary] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)

  const { data: dashboard } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboards/admin')
      return res.data
    },
  })

  const currentFundValue = dashboard?.availableBalance || 0
  const parsedAmount = amount ? parseInt(amount.replace(/,/g, ''), 10) : 0
  const balanceAfter = currentFundValue - (isNaN(parsedAmount) ? 0 : parsedAmount)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) setAmount('')
    else setAmount(parseInt(raw, 10).toLocaleString('en-US'))
  }

  const recordMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('amount', parsedAmount.toString())
      formData.append('withdrawalDate', withdrawalDate)
      formData.append('category', category)
      formData.append('beneficiary', beneficiary)
      formData.append('description', description)
      if (file) {
        formData.append('supportingDoc', file)
      }

      const res = await api.post('/withdrawals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('Withdrawal recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] })
      // Reset form
      setAmount('')
      setWithdrawalDate(format(new Date(), 'yyyy-MM-dd'))
      setCategory('OTHER')
      setBeneficiary('')
      setDescription('')
      setFile(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to record withdrawal')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedAmount <= 0) return toast.error('Please enter a valid amount')
    if (!beneficiary) return toast.error('Please enter a reference (beneficiary)')
    if (!description) return toast.error('Please enter notes (description)')
    recordMutation.mutate()
  }

  return (
    <div className="max-w-6xl pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading text-text-main">Record a withdrawal</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column - Form */}
        <div className="flex-1 bg-white rounded-2xl border border-border-warm p-8 w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Transaction type banner */}
            <div>
              <p className="text-sm font-bold text-text-main mb-2">Transaction type</p>
              <div className="bg-terracotta/5 border border-terracotta/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-terracotta shrink-0" />
                  <span className="font-bold text-terracotta">Withdrawal — money out</span>
                </div>
                <span className="text-xs font-medium text-terracotta/60">Reduces the group fund</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-text-main mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                    placeholder="1,000,000"
                    required
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <span className="text-text-muted font-bold text-sm">RWF</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-text-main mb-2">Date</label>
                <input
                  type="date"
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-text-main mb-2">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium appearance-none cursor-pointer"
                  >
                    <option value="OTHER">Investment</option>
                    <option value="LOAN">Loan Payout</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="PAYOUT">Dividend / Payout</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-text-main mb-2">Reference</label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="Land plot — Kicukiro"
                  className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Justification / proof</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors
                  ${file ? 'border-brand-green bg-brand-green/5' : 'border-border-warm bg-bg-warm/50 hover:bg-bg-warm'}`}
                style={!file ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(232,228,218,0.3) 0, rgba(232,228,218,0.3) 2px, transparent 2px, transparent 8px)' } : {}}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0])
                  }}
                  accept="application/pdf,image/jpeg,image/png"
                />
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-border-warm flex items-center justify-center mb-4">
                  <Upload className="w-5 h-5 text-text-muted" />
                </div>
                <p className="font-bold text-text-main text-sm mb-1">
                  {file ? file.name : 'Receipt or group resolution document'}
                </p>
                <p className="text-[10px] font-bold text-text-muted tracking-wider">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF · JPG · PNG — max 5 MB'}
                </p>
              </div>
              {file && (
                <button 
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-terracotta text-xs font-bold mt-2 hover:underline"
                >
                  Remove file
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Approved by group vote on 12 Jun 2026. Deposit toward land purchase."
                className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium min-h-[100px] resize-y"
                required
              />
            </div>

            <button
              type="submit"
              disabled={recordMutation.isPending}
              className="w-full py-4 rounded-xl bg-terracotta text-white font-bold hover:bg-terracotta/90 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {recordMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Record withdrawal'
              )}
            </button>
          </form>
        </div>

        {/* Right Column - Impact */}
        <div className="w-full lg:w-96 bg-white rounded-2xl border border-border-warm p-6 shrink-0">
          <h2 className="text-sm font-bold text-text-main mb-6">Fund impact</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center text-sm font-medium text-text-muted">
              <span>Current fund value</span>
              <span className="text-text-main font-bold">{formatNumber(currentFundValue)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium text-text-muted pb-4 border-b border-border-warm">
              <span>This withdrawal</span>
              <span className="text-terracotta font-bold">
                {parsedAmount > 0 ? '-' : ''} {formatNumber(parsedAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold text-text-muted">Balance after</span>
              <span className="text-2xl font-bold font-heading text-text-main">
                {formatNumber(balanceAfter)}
              </span>
            </div>
          </div>

          <div className="bg-terracotta/5 rounded-xl p-4 flex gap-3 border border-terracotta/10">
            <AlertTriangle className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
            <p className="text-xs text-terracotta leading-relaxed font-medium">
              Withdrawals reduce the group fund and are permanently logged in the audit trail with your name attached.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
