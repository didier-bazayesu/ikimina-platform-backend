export type Role = 'ADMIN' | 'MEMBER'
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'EXITED'

export interface AuthUser {
  id: string
  email: string
  role: Role
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

export interface Member {
  id: string
  userId: string
  memberNumber: string
  fullName: string
  nationalId: string | null
  address: string | null
  joinedDate: string // ISO timestamp
  createdAt: string
  email: string
  phone: string
  status: MemberStatus
}

export interface MemberDashboard {
  totalApprovedContributions: number
  totalApprovedPenalties: number
  outstandingObligationsCount: number
  outstandingObligationsAmount: number
  unpaidPenaltiesAmount: number
}

export interface AdminDashboard {
  totalActiveMembers: number
  availableBalance: number
  pendingContributionPayments: number
  pendingPenaltyPayments: number
  totalWithdrawalsCurrentMonth: number
}
