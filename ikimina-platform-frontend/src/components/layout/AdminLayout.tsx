import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Settings,
  CheckSquare,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Avatar } from '../ui/Avatar'

const NAV_ITEMS = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/admin/approvals', label: 'Approvals', icon: CheckSquare },
  { path: '/admin/members', label: 'Members', icon: Users },
  { path: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  { path: '/admin/penalties', label: 'Penalties', icon: AlertTriangle },
  { path: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayName = user.email.split('@')[0]
  const displayInitials = displayName.substring(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-bg-warm flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-border-warm flex flex-col fixed inset-y-0 z-10">
        <div className="h-20 flex items-center px-6 border-b border-border-warm">
          <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center text-white font-bold text-sm shrink-0">IK</div>

          <div className="ml-3 flex flex-col justify-center">
            <span className="font-heading font-bold text-sm tracking-wide text-text-main leading-none">
              IKIMINA
            </span>

            <span className="text-[10px] uppercase font-bold text-brand-green/70 tracking-wider mt-0.5">
              Treasurer Console
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon

            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'text-text-muted hover:bg-black/5 hover:text-text-main'
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 mr-3 ${
                    isActive ? 'text-brand-green' : 'text-text-muted'
                  }`}
                />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-border-warm">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-terracotta/10 group transition-colors text-left"
            title="Log out"
          >
            <Avatar
              initials={displayInitials}
              className="bg-brand-green/10 text-brand-green font-bold border border-brand-green/20 group-hover:hidden"
            />
            <div className="w-10 h-10 rounded-full bg-terracotta/20 text-terracotta hidden group-hover:flex items-center justify-center border border-terracotta/30">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-main capitalize truncate group-hover:text-terracotta transition-colors">
                {displayName}
              </p>
              <p className="text-xs text-text-muted truncate group-hover:text-terracotta/70 transition-colors">
                Treasurer - Admin
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  )
}
