import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogoDark } from '../ui/Logo'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../auth/AuthContext'
import { useCurrentMember } from '../../pages/member/useCurrentMember'

export function MemberLayout() {
  const { logout } = useAuth()
  const member = useCurrentMember()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream py-4 md:py-6 lg:py-8 lg:mx-2 font-body">
      <div className="bg-surface rounded-2xl shadow-sm border border-border-warm min-h-[85vh] flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border-warm bg-surface">
          <div className="flex-1">
            <LogoDark />
          </div>

          <nav className="hidden md:flex items-center gap-2 bg-cream rounded-full p-1 border border-border-warm">
            <NavLink
              to="/member"
              end
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-green-tint text-brand-green" : "text-text-muted hover:text-text-main"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/member/contribute"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-green-tint text-brand-green" : "text-text-muted hover:text-text-main"}`
              }
            >
              Contribute
            </NavLink>
            <NavLink
              to="/member/history"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-green-tint text-brand-green" : "text-text-muted hover:text-text-main"}`
              }
            >
              History
            </NavLink>
          </nav>

          <div className="flex-1 flex justify-end">
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <Avatar initials={member.initials} />
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-text-main leading-tight">
                    {member.fullName}
                  </div>
                  <div className="text-[10px] text-text-muted font-medium">
                    Member &middot; #{member.memberNumber}
                  </div>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border-warm rounded-lg shadow-lg py-1 z-10">
                  <NavLink
                    to="/member/profile"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block w-full text-left px-4 py-2 text-sm transition-colors ${isActive ? "bg-green-tint text-brand-green font-medium" : "text-text-main hover:bg-black/5"}`
                    }
                  >
                    Profile Settings
                  </NavLink>
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 text-sm text-terracotta hover:bg-terracotta-tint transition-colors border-t border-border-warm mt-1"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Nav (bottom or below header) */}
        <div className="md:hidden border-b border-border-warm bg-surface px-4 py-2 overflow-x-auto">
          <nav className="flex items-center gap-2">
            <NavLink
              to="/member"
              end
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-green-tint text-brand-green" : "text-text-muted"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/member/contribute"
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-green-tint text-brand-green" : "text-text-muted"}`
              }
            >
              Contribute
            </NavLink>
            <NavLink
              to="/member/history"
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-green-tint text-brand-green" : "text-text-muted"}`
              }
            >
              History
            </NavLink>
          </nav>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 bg-cream/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
