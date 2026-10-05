import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { AdminDashboard, MemberDashboard } from './types'

export const useMemberDashboard = () =>
  useQuery({
    queryKey: ['dashboard', 'member'],
    queryFn: async () => (await api.get<MemberDashboard>('/dashboards/member')).data,
  })

export const useAdminDashboard = () =>
  useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => (await api.get<AdminDashboard>('/dashboards/admin')).data,
  })
