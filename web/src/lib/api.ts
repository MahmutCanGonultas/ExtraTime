// Single HTTP client for the whole frontend. It attaches the JWT, unwraps the
// backend's consistent { error: { code, message } } shape, and never talks to
// API-Football directly (everything goes through our own API).
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage'
import { markSiteDown } from '@/lib/siteStatus'

const TOKEN_KEY = 'extratime_token'

// Via the safe helpers so a storage-blocked browser degrades gracefully instead
// of throwing during the auth boot effect (which would blank the app).
export const tokenStore = {
  get: () => safeGetItem(TOKEN_KEY),
  set: (token: string) => safeSetItem(TOKEN_KEY, token),
  clear: () => safeRemoveItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

interface RequestOptions {
  method?: string
  body?: unknown
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const token = tokenStore.get()
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(BASE_URL + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  // 503 = the backend's maintenance kill switch (or a genuine outage). Flip the
  // whole app to the offline page rather than surfacing a per-widget error.
  if (res.status === 503) markSiteDown()

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Bir hata oluştu')
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
