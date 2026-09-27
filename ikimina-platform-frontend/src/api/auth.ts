import { api } from './client'
import { tokenStorage } from './tokenStorage'
import type { LoginResponse } from './types'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return
  try {
    await api.post('/auth/logout', { refreshToken })
  } catch {
    // Even if revoking fails, the user still gets logged out locally.
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword })
}
