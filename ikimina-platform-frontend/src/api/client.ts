import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from './tokenStorage'

const baseURL: string = import.meta.env.VITE_API_URL ?? ''

export const AUTH_EXPIRED_EVENT = 'auth:expired'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * The backend wraps responses as { success, data, message }, and some
 * controllers wrap a second time. Peel every envelope so screens only
 * ever see the real payload.
 */
function isEnvelope(v: unknown): v is { success: boolean; data: unknown } {
  return typeof v === 'object' && v !== null && 'success' in v && 'data' in v
}

export function unwrap<T>(body: unknown): T {
  let current = body
  while (isEnvelope(current)) current = current.data
  return current as T
}

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) throw new Error('No refresh token')
  // Plain axios (no interceptors) so a failing refresh can never loop.
  const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
  const data = unwrap<{ accessToken: string; refreshToken?: string }>(res.data)
  tokenStorage.setTokens(data.accessToken, data.refreshToken ?? refreshToken)
  return data.accessToken
}

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const body = error.response?.data as { message?: string | string[] } | undefined
  const raw = body?.message
  const message = Array.isArray(raw)
    ? raw.join(', ')
    : (raw ??
      (status === 0 ? 'Cannot reach the server. Is the backend running?' : error.message))
  return new ApiError(message, status, error.response?.data)
}

api.interceptors.response.use(
  (response) => {
    response.data = unwrap(response.data)
    return response
  },
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined
    const isAuthCall = ['/auth/login', '/auth/refresh'].some((p) => original?.url?.includes(p))

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true
      let token: string
      try {
        // One refresh at a time; parallel 401s share the same promise.
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        token = await refreshPromise
      } catch {
        tokenStorage.clear()
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
        throw toApiError(error)
      }
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    }
    throw toApiError(error)
  },
)
