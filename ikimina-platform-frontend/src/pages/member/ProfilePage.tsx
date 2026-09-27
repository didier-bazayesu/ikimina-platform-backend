import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useCurrentMember } from './useCurrentMember'

export function ProfilePage() {
  const member = useCurrentMember()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: ''
  })
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (member.fullName) {
      setFormData({
        fullName: member.fullName,
        phone: member.phone || '',
        address: member.address || ''
      })
    }
  }, [member.fullName, member.phone, member.address])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.patch('/members/me', data)
      return res.data
    },
    onSuccess: () => {
      setSuccessMsg('Profile updated successfully!')
      setErrorMsg('')
      queryClient.invalidateQueries({ queryKey: ['currentMember'] })
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err: any) => {
      setSuccessMsg('')
      setErrorMsg(err?.response?.data?.message || 'Failed to update profile.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (!member.fullName) {
    return <div className="animate-pulse h-64 bg-white rounded-xl border border-border-warm"></div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading text-text-main">My Profile</h1>
        <p className="text-text-muted mt-1">Manage your personal information and contact details.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border-warm p-6 md:p-8 shadow-sm">
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-brand-green/10 border border-brand-green/20 text-brand-green font-medium text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        )}
        
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-terracotta/10 border border-terracotta/20 text-terracotta font-medium text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wide uppercase text-text-muted">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-border-warm bg-bg-warm focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all outline-none text-text-main font-medium"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wide uppercase text-text-muted">Email (Read Only)</label>
              <input
                type="email"
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-border-warm bg-black/5 text-text-muted font-medium outline-none cursor-not-allowed"
                value={member.email || ''}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wide uppercase text-text-muted">Phone Number</label>
              <input
                type="tel"
                className="w-full px-4 py-3 rounded-xl border border-border-warm bg-bg-warm focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all outline-none text-text-main font-medium"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wide uppercase text-text-muted">National ID (Read Only)</label>
              <input
                type="text"
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-border-warm bg-black/5 text-text-muted font-medium outline-none cursor-not-allowed"
                value={member.nationalId || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wide uppercase text-text-muted">Address</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-border-warm bg-bg-warm focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all outline-none text-text-main font-medium"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-3 rounded-xl bg-brand-green text-white font-bold tracking-wide hover:bg-brand-green/90 transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
