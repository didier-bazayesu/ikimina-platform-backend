/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import { AUTH_EXPIRED_EVENT } from '../api/client'
import { tokenStorage } from '../api/tokenStorage'
import type { AuthUser, Role } from '../api/types'

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const homeFor = (role: Role) => (role === 'ADMIN' ? '/admin' : '/member')

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(() =>
    tokenStorage.getAccess() ? tokenStorage.getUser() : null,
  )

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStorage.setSession(res.accessToken, res.refreshToken, res.user)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    tokenStorage.clear()
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  // The API client fires this when a token refresh fails (session over).
  useEffect(() => {
    const onExpired = () => {
      queryClient.clear()
      setUser(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [queryClient])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
