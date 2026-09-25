import { Navigate, Route, Routes } from 'react-router-dom'
import { homeFor, useAuth } from './auth/AuthContext'
import { RequireRole } from './auth/RequireRole'
import LoginPage from './pages/LoginPage'
import { AdminLayout } from './components/layout/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ApprovalsPage } from './pages/admin/ApprovalsPage'
import { MembersPage } from './pages/admin/MembersPage'
import { PenaltiesPage } from './pages/admin/PenaltiesPage'
import { TransactionsPage } from './pages/admin/TransactionsPage'
import { WithdrawalsPage } from './pages/admin/WithdrawalsPage'
import { MemberLayout } from './components/layout/MemberLayout'
import { MemberDashboardPage } from './pages/member/MemberDashboard'
import { ContributePage } from './pages/member/ContributePage'
import { HistoryPage } from './pages/member/HistoryPage'
import { ProfilePage } from './pages/member/ProfilePage'

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireRole role="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="penalties" element={<PenaltiesPage />} />
          <Route path="withdrawals" element={<WithdrawalsPage />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="MEMBER" />}>
        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<MemberDashboardPage />} />
          <Route path="contribute" element={<ContributePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  )
}
