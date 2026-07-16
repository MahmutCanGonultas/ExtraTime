import { env } from '../../config/env'
import { logger } from '../logger'

// Shape every API-Football v3 endpoint returns.
export interface ApiFootballEnvelope<T> {
  get: string
  results: number
  paging: { current: number; total: number }
  errors: unknown
  response: T
}

// The daily budget is precious (100/day on the free plan), so we count every
// request. Sync jobs snapshot this counter to record api_requests_used.
let requestCount = 0
export function getRequestCount(): number {
  return requestCount
}
export function resetRequestCount(): void {
  requestCount = 0
}

const REQUEST_TIMEOUT_MS = 15_000

// Serialize requests with a minimum gap (derived from the plan's requests/min)
// so a burst — e.g. a multi-league backfill — never trips HTTP 429.
const MIN_REQUEST_GAP_MS = Math.ceil(60_000 / env.API_FOOTBALL_RPM)
let lastRequestAt = 0

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()
}

function hasErrors(errors: unknown): boolean {
  if (Array.isArray(errors)) return errors.length > 0
  if (errors && typeof errors === 'object') return Object.keys(errors).length > 0
  return false
}

/**
 * Single choke point for talking to API-Football. Nothing else in the codebase
 * calls fetch against the external API — this is where the daily budget is spent.
 */
export async function apiFootballGetEnvelope<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<ApiFootballEnvelope<T>> {
  if (!env.API_FOOTBALL_KEY) {
    throw new Error('API_FOOTBALL_KEY is not configured')
  }

  await throttle()

  const url = new URL(path.replace(/^\//, ''), `${env.API_FOOTBALL_BASE_URL}/`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  requestCount += 1

  try {
    const res = await fetch(url, {
      headers: { 'x-apisports-key': env.API_FOOTBALL_KEY },
      signal: controller.signal,
    })
    logger.info({ path, params, requestCount }, 'API-Football request')

    if (!res.ok) {
      throw new Error(`API-Football ${path} responded with HTTP ${res.status}`)
    }

    const body = (await res.json()) as ApiFootballEnvelope<T>
    // API-Football sometimes returns HTTP 200 with a non-empty errors object
    // (rate limit hit, invalid params). Surface it but don't crash the caller.
    if (hasErrors(body.errors)) {
      logger.warn({ path, errors: body.errors }, 'API-Football returned errors')
    }

    return body
  } finally {
    clearTimeout(timer)
  }
}

export async function apiFootballGet<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const body = await apiFootballGetEnvelope<T>(path, params)
  return body.response
}
