import type { AuthUser } from './types'

const ACCESS = 'ikimina.accessToken'
const REFRESH = 'ikimina.refreshToken'
const USER = 'ikimina.user'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  },
  setTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS, access)
    localStorage.setItem(REFRESH, refresh)
  },
  setSession(access: string, refresh: string, user: AuthUser) {
    this.setTokens(access, refresh)
    localStorage.setItem(USER, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
    localStorage.removeItem(USER)
  },
}
