import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatNumber, formatDate } from '../../lib/format'
import { Avatar } from '../../components/ui/Avatar'
import { Search, ChevronLeft } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { HistoryView } from '../member/HistoryPage'
import { Button } from '../../components/ui/Button'
import { format, differenceInMonths } from 'date-fns'

// ─── Types matching backend response ──────────────────────────────────────────

interface MemberWithStats {
  id: string
  memberNumber: string
  fullName: string
  email: string
  phone?: string
  address?: string | null
  joinedDate?: string
  status: 'ACTIVE' | 'EXITED' | 'SUSPENDED'
  shares: number
  contributed: number
  unpaidPenalty: number
  missing: number
  lastPayment: string | null
}

function MemberDetailView({ member, onBack }: { member: MemberWithStats; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false)
  const [isConfirmingExit, setIsConfirmingExit] = useState(false)
    const [isRecordingOnBehalf, setIsRecordingOnBehalf] = useState(false)
  const initials = member.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
  
  const isActive = member.status === 'ACTIVE'
  const isExited = member.status === 'EXITED'

  const statusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = isActive ? 'SUSPENDED' : 'ACTIVE'
      await api.patch(`/members/${member.id}/status`, {
        status: newStatus,
        reason: isActive ? 'Suspended by admin' : 'Reactivated by admin',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] })
      toast.success(isActive ? `${member.fullName} has been suspended` : `${member.fullName} has been reactivated`)
      setIsConfirmingStatus(false)
      onBack()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update status')
    },
  })

  const exitMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/members/${member.id}/status`, {
        status: 'EXITED',
        reason: 'Member left the group',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] })
      toast.success(`${member.fullName} has exited the group`)
      setIsConfirmingExit(false)
      onBack()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to exit member')
    },
  })

  let monthsInGroup = 0
  if (member.joinedDate) {
    monthsInGroup = differenceInMonths(new Date(), new Date(member.joinedDate))
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {isEditing && <EditMemberModal member={member} onClose={() => setIsEditing(false)} onDeactivate={() => setIsConfirmingStatus(true)} />}

      {/* Deactivate / Reactivate Confirmation Modal */}
      {isConfirmingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full border border-border-warm p-8 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${isActive ? 'bg-terracotta/10' : 'bg-brand-green/10'}`}>
              {isActive ? (
                <svg className="w-7 h-7 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-heading font-bold text-text-main mb-3">
              {isActive ? `Suspend ${member.fullName}?` : `Reactivate ${member.fullName}?`}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-8">
              {isActive ? (
                <>They will no longer be able to log in or submit transactions.<br/>
                Their shares, contributions and penalties are <strong className="text-terracotta">kept</strong> — you can reactivate them anytime.</>
              ) : (
                <>They will regain access to log in and submit transactions.<br/>
                All their historical data remains <strong className="text-brand-green">intact</strong>.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmingStatus(false)}
                className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl border border-border-warm text-text-main font-bold hover:bg-bg-warm transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className={`cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-white font-bold transition-colors text-sm flex items-center justify-center disabled:opacity-50 ${
                  isActive ? 'bg-terracotta hover:bg-terracotta/90' : 'bg-brand-green hover:bg-brand-green/90'
                }`}
              >
                {statusMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isActive ? 'Suspend' : 'Reactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {isConfirmingExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full border border-border-warm p-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 bg-red-100">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-heading font-bold text-text-main mb-3">
              Exit {member.fullName}?
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-8">
              This marks the member as permanently leaving the group.<br/><br/>
              Their login access will be disabled, but all historical financial records will remain intact for auditing purposes.<br/><br/>
              <strong className="text-red-600">This action cannot be undone by reactivating.</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmingExit(false)}
                className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl border border-border-warm text-text-main font-bold hover:bg-bg-warm transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => exitMutation.mutate()}
                disabled={exitMutation.isPending}
                className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-white font-bold bg-red-600 hover:bg-red-700 transition-colors text-sm flex items-center justify-center disabled:opacity-50"
              >
                {exitMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Exit Member'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Actions */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="cursor-pointer flex items-center gap-2 text-sm font-bold text-text-main hover:text-brand-green transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to members
        </button>
        <div className="flex items-center gap-3">
          {isExited ? (
            <span className="text-sm font-bold text-text-muted bg-bg-warm px-4 py-1.5 rounded-xl border border-border-warm">
              EXITED: Historical Record
            </span>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline" className="cursor-pointer text-xs py-1.5 px-4 h-auto">Edit</Button>
              <Button
                onClick={() => setIsConfirmingStatus(true)}
                variant="outline"
                className={`cursor-pointer text-xs py-1.5 px-4 h-auto ${isActive ? 'text-terracotta border-terracotta hover:bg-terracotta/5' : 'text-brand-green border-brand-green hover:bg-brand-green/5'}`}
              >
                {isActive ? 'Suspend' : 'Reactivate'}
              </Button>
              <Button
                onClick={() => setIsConfirmingExit(true)}
                variant="outline"
                className="cursor-pointer text-xs py-1.5 px-4 h-auto text-red-600 border-red-600 hover:bg-red-50"
              >
                Exit Member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-border-warm p-6 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <Avatar initials={initials} className="w-16 h-16 text-lg bg-[#C8704A] text-white" />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold font-heading text-text-main">{member.fullName}</h2>
              <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider ${
                member.status === 'ACTIVE' 
                  ? 'bg-brand-green/10 text-brand-green' 
                  : member.status === 'SUSPENDED'
                    ? 'bg-terracotta/10 text-terracotta'
                    : 'bg-border-warm text-text-muted'
              }`}>
                {member.status}
              </span>
            </div>
            <p className="text-text-muted text-[13px] leading-relaxed">
              Member {member.memberNumber} &middot; {member.phone || 'No phone'} &middot; <span className="text-brand-green">{member.email}</span><br />
              Joined {member.joinedDate ? format(new Date(member.joinedDate), 'MMMM yyyy') : 'Unknown'} &middot; {monthsInGroup} months in the group
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setIsRecordingOnBehalf(true)} className="whitespace-nowrap bg-brand-green/10 text-brand-green border-0 hover:bg-brand-green/20">
          Record on behalf
          </Button>
          {isRecordingOnBehalf && <RecordOnBehalfModal member={member} onClose={() => setIsRecordingOnBehalf(false)} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="TOTAL SHARES"
          value={member.shares.toString()}
          caption={`of ${monthsInGroup} months`}
        />
        <StatCard
          label="TOTAL CONTRIBUTED"
          value={formatNumber(member.contributed)}
          unit="RWF"
        />
        <StatCard
          label="UNPAID PENALTY"
          value={formatNumber(member.unpaidPenalty)}
          unit="RWF"
          tone={member.unpaidPenalty > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="MISSING MONTHS"
          value={member.missing.toString()}
        />
      </div>

      {/* Reused History View */}
      <HistoryView memberId={member.id} showHeader={false} />
    </div>
  )
}

import { useSearchParams } from 'react-router-dom'
import { UserPlus, CheckCircle2 } from 'lucide-react'

function EditMemberModal({ member, onClose, onDeactivate }: { member: MemberWithStats, onClose: () => void, onDeactivate: () => void }) {
  const queryClient = useQueryClient()
  
  const [fullName, setFullName] = useState(member.fullName)
  const [phone, setPhone] = useState(member.phone || '')
  const [address, setAddress] = useState(member.address || '')

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = { fullName, phone, address: address || undefined }
      await api.patch(`/members/${member.id}`, payload)
      // Status change is handled by the Deactivate button — not here
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      toast.success('Member updated')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update member')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !phone) {
      return toast.error('Full name and phone are required.')
    }
    updateMutation.mutate()
  }

  const isActive = member.status === 'ACTIVE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-border-warm p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center shrink-0">
            <span className="font-bold text-brand-green">{member.fullName.substring(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-text-main mb-1">Edit member</h3>
            <p className="text-sm text-text-muted">Member {member.memberNumber} &middot; joined {member.joinedDate ? format(new Date(member.joinedDate), 'MMMM yyyy') : 'Unknown'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">Address <span className="font-normal text-text-muted">(optional)</span></label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
              placeholder="KG 123 St, Kigali"
            />
          </div>

          <div className="flex w-full gap-3 pt-6">
            <button
              type="button"
              onClick={() => { onClose(); onDeactivate() }}
              className={`cursor-pointer px-4 py-2.5 rounded-xl border font-bold text-sm transition-colors ${
                isActive
                  ? 'border-terracotta text-terracotta hover:bg-terracotta/5'
                  : 'border-brand-green text-brand-green hover:bg-brand-green/5'
              }`}
            >
              {isActive ? 'Deactivate' : 'Reactivate'}
            </button>
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer px-6 py-2.5 rounded-xl border border-border-warm text-text-main font-bold hover:bg-bg-warm transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="cursor-pointer px-6 py-2.5 rounded-xl bg-[#245D40] text-white font-bold hover:bg-[#245D40]/90 transition-colors text-sm flex items-center justify-center min-w-[120px] disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [successData, setSuccessData] = useState<any>(null)
  
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinedDate, setJoinedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = { fullName, phone, email, password, joinedDate }
      const res = await api.post('/members', payload)
      return (res.data as any)?.data ?? res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setSuccessData(data)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create member')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !phone || !email || !password) {
      return toast.error('All fields including email and password are required.')
    }
    createMutation.mutate()
  }

  const handleAddAnother = () => {
    setSuccessData(null)
    setFullName('')
    setPhone('')
    setEmail('')
    setPassword('')
  }

  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-border-warm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-brand-green" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-text-main mb-2">Member added</h2>
          <p className="text-sm text-text-muted mb-6">
            <strong className="text-text-main">{successData.fullName} ({successData.memberNumber})</strong> is now in the group.<br/>
            An invite was sent to {successData.phone}.
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[11px] font-bold">Invite sent</span>
            <span className="px-3 py-1 rounded-full bg-bg-warm text-text-muted text-[11px] font-bold">Starts {format(new Date(successData.joinedDate), 'MMM yyyy')}</span>
          </div>
          <div className="flex w-full gap-3">
            <button onClick={handleAddAnother} className="flex-1 px-4 py-2.5 rounded-xl border border-border-warm text-text-main font-bold hover:bg-bg-warm transition-colors text-sm">
              Add another
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green/90 transition-colors text-sm">
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-border-warm p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-text-main mb-1">Add a member</h3>
            <p className="text-sm text-text-muted">They'll get an invite to set a password.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
              placeholder="Didier Uwase"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                placeholder="+250 788 305 219"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Email (required)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-brand-green underline focus:outline-none focus:border-brand-green font-medium"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Member number</label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  className="w-full bg-bg-warm border border-transparent rounded-xl px-4 py-3 text-text-muted font-medium"
                  value="auto"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Obligations start</label>
              <input
                type="date"
                value={joinedDate}
                onChange={e => setJoinedDate(e.target.value)}
                className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main mb-2">Password (Admin sets)</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-green font-medium"
              placeholder="Temp@Pass123"
              required
              minLength={8}
            />
          </div>

          <div className="bg-bg-warm/50 rounded-xl p-4 flex gap-3 border border-border-warm my-6">
            <span className="text-text-muted shrink-0 mt-0.5">ⓘ</span>
            <p className="text-xs text-text-muted leading-relaxed">
              Shares and penalties begin from the <strong className="font-bold">start month</strong> you choose — earlier months won't count against them.
            </p>
          </div>

          <div className="flex w-full gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-6 py-2.5 rounded-xl border border-border-warm text-text-main font-bold hover:bg-bg-warm transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="cursor-pointer px-6 py-2.5 rounded-xl bg-[#245D40] text-white font-bold hover:bg-[#245D40]/90 transition-colors text-sm flex items-center justify-center min-w-[140px] disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function RecordOnBehalfModal({ member, onClose }: { member: MemberWithStats, onClose: () => void }) {
  const queryClient = useQueryClient()
  const [withPenalty, setWithPenalty] = useState(true)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])

  const { data: unpaidObligations = [], isLoading } = useQuery({
    queryKey: ['adminUnpaidObligations', member.id],
    queryFn: async () => {
      const res = await api.get('/monthly-obligations', { params: { memberId: member.id, status: 'UNPAID', limit: 100 } })
      return (res.data as any).data?.items || []
    }
  })

  const recordMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        memberId: member.id,
        obligationIds: selectedMonths,
        amount: parseFloat(amount.replace(/,/g, '')),
        paymentDate: date,
        withPenalty,
        notes
      }
      await api.post('/contribution-payments/record-on-behalf', payload)
    },
    onSuccess: () => {
      toast.success('Payment recorded and auto-approved')
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record payment')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMonths.length === 0) return toast.error('Please select at least one month')
    recordMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#FAF9F5] rounded-[2rem] shadow-xl max-w-[460px] w-full border border-[#EAE7DF] p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-[#C2593F] text-white flex items-center justify-center shrink-0 font-bold">
            {member.fullName.substring(0,2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-[#1A1A1A] leading-tight">Record on behalf of {member.fullName.split(' ')[0]}</h2>
            <p className="text-sm text-[#737373] mt-1">For a member who paid you in cash or off-app.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Penalty included?</label>
            <div className="flex p-1 bg-[#F1EFE7] rounded-xl">
              <button type="button" onClick={() => setWithPenalty(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${withPenalty ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#737373] hover:text-[#1A1A1A]'}`}>With penalty</button>
              <button type="button" onClick={() => setWithPenalty(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!withPenalty ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#737373] hover:text-[#1A1A1A]'}`}>Without penalty</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div>
              <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Amount</label>
              <div className="relative">
                <input type="text" required value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full bg-white border border-[#EAE7DF] rounded-xl pl-4 pr-10 py-3 text-[#1A1A1A] focus:outline-none focus:border-[#2A5C43] font-medium" placeholder="44,000" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#737373]">RWF</span>
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Months</label>
              <div className="relative group">
                <div className="w-full bg-white border border-[#EAE7DF] rounded-xl px-3 py-3 text-[#1A1A1A] text-[13px] truncate font-medium cursor-pointer flex items-center justify-between">
                  <span>{selectedMonths.length === 0 ? 'Select' : `${selectedMonths.length} selected`}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div className="absolute top-full left-0 w-[200px] mt-1 bg-white border border-[#EAE7DF] rounded-xl shadow-lg p-2 hidden group-hover:block z-10 max-h-48 overflow-y-auto">
                  {isLoading ? <div className="p-2 text-xs text-[#737373]">Loading...</div> : unpaidObligations.map((ob: any) => (
                    <label key={ob.id} className="flex items-center gap-2 p-2 hover:bg-[#FAF9F5] rounded-lg cursor-pointer">
                      <input type="checkbox" checked={selectedMonths.includes(ob.id)} onChange={(e) => { if (e.target.checked) setSelectedMonths([...selectedMonths, ob.id]); else setSelectedMonths(selectedMonths.filter(id => id !== ob.id)); }} />
                      <span className="text-[13px] font-medium">{format(new Date(ob.year, ob.month - 1), 'MMM yyyy')}</span>
                    </label>
                  ))}
                  {!isLoading && unpaidObligations.length === 0 && <div className="p-2 text-xs text-[#737373]">No unpaid months</div>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-[#EAE7DF] rounded-xl px-2 py-3 text-[#1A1A1A] text-[13px] focus:outline-none focus:border-[#2A5C43] font-medium" />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[13px] text-[#737373] mb-2 font-bold">Proof / note (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Received 44,000 in cash..." className="w-full bg-white border border-[#EAE7DF] rounded-xl px-4 py-3 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#2A5C43] font-medium" />
          </div>

          <div className="bg-[#2A5C43]/10 text-[#2A5C43] p-4 rounded-xl text-sm font-medium flex gap-3 mb-8 items-start">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Recorded by <strong>you</strong> and auto-approved. The entry is attributed to you in the audit log.</p>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-[#EAE7DF] font-bold text-[#1A1A1A] hover:bg-[#EAE7DF]/50 transition-colors bg-white">Cancel</button>
            <button type="submit" disabled={recordMutation.isPending} className="px-6 py-3 rounded-xl bg-[#2A5C43] text-white font-bold hover:bg-[#2A5C43]/90 transition-colors disabled:opacity-50">{recordMutation.isPending ? 'Recording...' : 'Record & approve'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  
  const selectedMemberId = searchParams.get('memberId')

  const setSelectedMemberId = (id: string | null) => {
    if (id) {
      setSearchParams({ memberId: id })
    } else {
      setSearchParams({})
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery<{ items: MemberWithStats[]; total: number }>({
    queryKey: ['adminMembers', debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/members', {
        params: {
          limit: 100, // Load enough for the table view
          search: debouncedSearch || undefined,
        },
      })
      const payload = (res.data as any)?.data ?? res.data
      return {
        items: payload?.items ?? [],
        total: payload?.total ?? 0,
      }
    },
  })

  const members = data?.items ?? []
  const total = data?.total ?? 0
  const activeCount = members.filter(m => m.status === 'ACTIVE').length

  const initials = (name: string) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const selectedMember = members.find(m => m.id === selectedMemberId)

  if (selectedMember) {
    return <MemberDetailView member={selectedMember} onBack={() => setSelectedMemberId(null)} />
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold font-heading text-text-main">Members</h1>
          {!isLoading && (
            <span className="text-text-muted text-sm">
              {total} total &middot; {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-border-warm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all w-64 text-sm"
            />
          </div>
          <button 
            onClick={() => setIsAddingMember(true)}
            className="cursor-pointer px-4 py-2 bg-brand-green text-white text-sm font-bold rounded-lg hover:bg-brand-green/90 transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Add member
          </button>
        </div>
      </div>

      {isAddingMember && <AddMemberModal onClose={() => setIsAddingMember(false)} />}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-warm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-warm/50 border-b border-border-warm text-[10px] font-bold tracking-wider uppercase text-text-muted">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Shares</th>
                <th className="px-6 py-4">Contributed</th>
                <th className="px-6 py-4">Unpaid Penalty</th>
                <th className="px-6 py-4">Missing</th>
                <th className="px-6 py-4">Last Payment</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-border-warm/50" />
                      <div className="space-y-2 py-1">
                        <div className="h-4 w-32 bg-border-warm/50 rounded" />
                        <div className="h-3 w-16 bg-border-warm/50 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-border-warm/50 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-border-warm/50 rounded-full" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => setSelectedMemberId(member.id)}
                    className="hover:bg-bg-warm/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={initials(member.fullName)} className="w-10 h-10 text-sm bg-indigo-500 text-white" />
                        <div>
                          <p className="font-bold text-text-main text-sm">{member.fullName}</p>
                          <p className="text-text-muted text-xs mt-0.5">{member.memberNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-main">{member.shares}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-main">{formatNumber(member.contributed)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {member.unpaidPenalty > 0 ? (
                        <span className="text-sm font-bold text-terracotta">{formatNumber(member.unpaidPenalty)}</span>
                      ) : (
                        <span className="text-sm text-text-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-muted">{member.missing}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-muted">
                        {member.lastPayment ? formatDate(member.lastPayment) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                        member.status === 'ACTIVE' 
                          ? 'bg-brand-green/10 text-brand-green' 
                          : member.status === 'SUSPENDED'
                            ? 'bg-terracotta/10 text-terracotta'
                            : 'bg-border-warm text-text-muted'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
