import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatNumber } from '../../lib/format'

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-brand-green' : 'bg-border-warm'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
)

export function SettingsPage() {
  const queryClient = useQueryClient()

  const [monthlyShare, setMonthlyShare] = useState<string>('')
  const [dueDay, setDueDay] = useState<number>(7)
  const [penaltyRate, setPenaltyRate] = useState<string>('')
  const [currency, setCurrency] = useState<string>('RWF')
  
  // Fake state for UI parity with design (not saved to backend)
  const [compoundMonthly, setCompoundMonthly] = useState(false)
  const [allocateOldest, setAllocateOldest] = useState(true)
  const [groupName, setGroupName] = useState('Gents IKIMINA for Investment')
  const [cycleStart, setCycleStart] = useState('January 2026')
  const [secondApprover, setSecondApprover] = useState(false)
  const [membersRegister, setMembersRegister] = useState(false)
  const [paymentReminders, setPaymentReminders] = useState(true)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const res = await api.get('/system-settings')
      return res.data
    },
  })

  useEffect(() => {
    if (settings) {
      setMonthlyShare(settings.monthlyShareAmount.toLocaleString('en-US'))
      setDueDay(settings.dueDay)
      setPenaltyRate(settings.penaltyPercentage.toString())
      setCurrency(settings.currency)
    }
  }, [settings])

  const parsedMonthlyShare = parseInt(monthlyShare.replace(/,/g, ''), 10) || 0
  const parsedPenaltyRate = parseFloat(penaltyRate) || 0
  const penaltyAmount = Math.round(parsedMonthlyShare * (parsedPenaltyRate / 100))

  const handleShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) setMonthlyShare('')
    else setMonthlyShare(parseInt(raw, 10).toLocaleString('en-US'))
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        monthlyShareAmount: parsedMonthlyShare,
        penaltyPercentage: parsedPenaltyRate,
        dueDay,
        currency,
      }
      await api.patch('/system-settings', payload)
    },
    onSuccess: () => {
      toast.success('Group settings updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update settings')
    },
  })

  const handleSave = () => {
    if (parsedMonthlyShare <= 0) return toast.error('Monthly share must be greater than 0')
    if (parsedPenaltyRate < 0) return toast.error('Penalty rate cannot be negative')
    if (dueDay < 1 || dueDay > 28) return toast.error('Due day must be between 1 and 28')
    updateMutation.mutate()
  }

  const suffix = (day: number) => {
    if (day > 3 && day < 21) return 'th'
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading text-text-main">Group settings</h1>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-6 py-2.5 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green/90 transition-colors flex items-center justify-center min-w-[140px] disabled:opacity-50 cursor-pointer text-sm"
        >
          {updateMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Save changes'
          )}
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-[#FFF8E6] border border-[#F4E1B3] rounded-xl p-4 flex gap-3 mb-8">
        <AlertCircle className="w-5 h-5 text-[#B88E14] shrink-0 mt-0.5" />
        <p className="text-sm text-[#94710A] font-medium leading-relaxed">
          Changes to the share or penalty rate apply to <strong className="font-bold">future cycles only</strong> — past months keep the values they were calculated with. Major changes should follow a group vote.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contribution rules */}
        <div className="bg-white rounded-2xl border border-border-warm p-6">
          <h2 className="font-bold text-text-main mb-1">Contribution rules</h2>
          <p className="text-sm text-text-muted mb-6">What every member owes each month.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Monthly share</label>
              <div className="relative">
                <input
                  type="text"
                  value={monthlyShare}
                  onChange={handleShareChange}
                  className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-text-muted font-bold text-sm">{currency}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Due day of month</label>
              <div className="flex items-center justify-between border border-border-warm rounded-xl p-1 bg-white">
                <button
                  onClick={() => setDueDay(d => Math.max(1, d - 1))}
                  className="w-10 h-10 rounded-lg bg-bg-warm hover:bg-black/5 flex items-center justify-center text-text-main font-bold cursor-pointer transition-colors"
                >
                  −
                </button>
                <span className="font-bold text-text-main">
                  {dueDay}{suffix(dueDay)}
                </span>
                <button
                  onClick={() => setDueDay(d => Math.min(28, d + 1))}
                  className="w-10 h-10 rounded-lg bg-bg-warm hover:bg-black/5 flex items-center justify-center text-text-main font-bold cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-text-muted mt-2 font-medium">Penalties generate the day after.</p>
            </div>
          </div>
        </div>

        {/* Penalties */}
        <div className="bg-white rounded-2xl border border-border-warm p-6">
          <h2 className="font-bold text-text-main mb-1">Penalties</h2>
          <p className="text-sm text-text-muted mb-6">Late fee for a missed month.</p>
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-text-main mb-2">Penalty rate</label>
              <div className="relative">
                <input
                  type="number"
                  value={penaltyRate}
                  onChange={(e) => setPenaltyRate(e.target.value)}
                  className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-text-muted font-bold text-sm">%</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-bold text-text-main mb-2">= Penalty amount</label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(penaltyAmount)}
                  disabled
                  className="w-full bg-bg-warm border border-transparent rounded-xl px-4 py-3 text-text-main font-medium opacity-70"
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-70">
                  <span className="text-text-muted font-bold text-sm">{currency}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-text-main text-sm">Compound monthly</p>
                <p className="text-xs text-text-muted">Penalty grows each month unpaid</p>
              </div>
              <Toggle checked={compoundMonthly} onChange={setCompoundMonthly} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-text-main text-sm">Allocate oldest unpaid first</p>
                <p className="text-xs text-text-muted">Auto-apply payments to oldest months</p>
              </div>
              <Toggle checked={allocateOldest} onChange={setAllocateOldest} />
            </div>
          </div>
        </div>

        {/* Group profile */}
        <div className="bg-white rounded-2xl border border-border-warm p-6">
          <h2 className="font-bold text-text-main mb-1">Group profile</h2>
          <p className="text-sm text-text-muted mb-6">Identity & locale.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Group name</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-text-main mb-2">Currency</label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium appearance-none cursor-pointer"
                  >
                    <option value="RWF">RWF</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-bold text-text-main mb-2">Cycle start</label>
                <input
                  type="text"
                  value={cycleStart}
                  onChange={e => setCycleStart(e.target.value)}
                  className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Governance */}
        <div className="bg-white rounded-2xl border border-border-warm p-6">
          <h2 className="font-bold text-text-main mb-1">Governance</h2>
          <p className="text-sm text-text-muted mb-6">Approvals & access.</p>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-text-main text-sm">Second approver for withdrawals</p>
                <p className="text-xs text-text-muted">A second admin must co-sign</p>
              </div>
              <Toggle checked={secondApprover} onChange={setSecondApprover} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-text-main text-sm">Members self-register</p>
                <p className="text-xs text-text-muted">Admin approves new sign-ups</p>
              </div>
              <Toggle checked={membersRegister} onChange={setMembersRegister} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-text-main text-sm">Payment reminders</p>
                <p className="text-xs text-text-muted">Notify members before the {dueDay}{suffix(dueDay)}</p>
              </div>
              <Toggle checked={paymentReminders} onChange={setPaymentReminders} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
