import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { homeFor, useAuth } from '../auth/AuthContext'
import { Logo } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotMsg, setShowForgotMsg] = useState(false)
  
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  if (user) return <Navigate to={homeFor(user.role)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      // WIRE: pass rememberMe to login() if supported by backend
      const loggedIn = await login(email, password)
      navigate(homeFor(loggedIn.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-cream font-body">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[480px] bg-gradient-to-br from-brand-green to-brand-dark flex-col justify-between p-12 text-white">
        <div>
          <Logo />
          
          <div className="mt-24 space-y-6">
            <h1 className="font-heading text-[2.75rem] font-bold leading-tight tracking-tight">
              Save together.<br />Grow together.
            </h1>
            <p className="text-lg text-white/90 leading-relaxed max-w-[340px]">
              One transparent record for the group's contributions, shares and penalties — replacing the spreadsheet, keeping every transfer proof-backed.
            </p>
            
            <ul className="space-y-4 mt-8 pt-4">
              {[
                '20,000 RWF monthly share, tracked per month',
                'Automatic penalties for missed months',
                'Every payment verified by the treasurer'
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-white/90 font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="text-xs font-mono text-white/60 tracking-wide uppercase">
          Africa/Kigali &middot; RWF &middot; Est. 2025
        </div>
      </div>

      {/* Mobile header (shown only on small screens) */}
      <div className="lg:hidden bg-brand-green p-6 w-full absolute top-0 left-0 text-white flex justify-between items-center z-10 shadow-sm">
        <Logo />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 pt-28 lg:pt-6 relative z-20">
        <div className="w-full max-w-[420px] bg-surface rounded-2xl shadow-card p-8 md:p-10 border border-border-warm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-heading tracking-tight mb-2 text-text-main">Welcome back</h2>
            <p className="text-text-muted">Sign in to view your savings standing.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-main" htmlFor="email">Email</label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-warm px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-shadow"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-main" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border-warm px-4 py-2.5 pr-16 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted hover:text-text-main"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border border-border-warm rounded bg-white peer-checked:bg-brand-green peer-checked:border-brand-green transition-colors flex items-center justify-center group-hover:border-brand-green/50">
                    {rememberMe && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-text-muted font-medium select-none">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotMsg(!showForgotMsg)}
                className="text-sm font-semibold text-brand-green hover:text-brand-dark"
              >
                Forgot password?
              </button>
            </div>

            {showForgotMsg && (
              <div className="bg-amber-tint text-amber-700 text-sm px-4 py-3 rounded-lg border border-amber/20">
                Contact your treasurer to reset your password.
                {/* WIRE: replace when a reset endpoint exists */}
              </div>
            )}

            {error && (
              <div role="alert" className="bg-terracotta-tint text-terracotta text-sm px-4 py-3 rounded-lg border border-terracotta/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3 mt-2 text-[15px]"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-border-warm after:h-px after:flex-1 after:bg-border-warm">
            <span className="text-xs font-medium text-border-warm tracking-wider uppercase">secure access</span>
          </div>

          <div className="mt-6 text-center text-sm text-text-muted">
            Members are added by the group admin.<br />Contact your treasurer for access.
          </div>
        </div>
      </div>
    </div>
  )
}

