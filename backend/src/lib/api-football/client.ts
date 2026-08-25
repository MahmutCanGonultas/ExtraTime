import { AsyncLocalStorage } from 'node:async_hooks'
import { env } from '../../config/env'
import { query } from '../../db/pool'
import { logger } from '../logger'
import { getDailyLimit, markRestricted } from './plan'

// Shape every API-Football v3 endpoint returns.
export interface ApiFootballEnvelope<T> {
  get: string
  results: number
  paging: { current: number; total: number }
  errors: unknown
  response: T
}

// Lifetime request count for this process. Logging only — never use it to decide
// anything, because two jobs running at once share it.
let requestCount = 0
export function getRequestCount(): number {
  return requestCount
}

/**
 * Per-job request counting.
 *
 * A single module-level counter that each job reset on entry was wrong the moment
 * two syncs overlapped — and they do overlap, because the internal cron and the
 * GitHub Actions trigger both fire against the same process. One job's reset
 * zeroed another's tally mid-flight, and those tallies are exactly what lands in
 * `sync_logs`, which is where the daily budget is hydrated from: an undercount
 * there lets the app spend past the ceiling. Each job now counts inside its own
 * async context instead.
 */
export interface RequestTally {
  count: number
}
const tallies = new AsyncLocalStorage<RequestTally>()

export function runWithTally<T>(tally: RequestTally, fn: () => Promise<T>): Promise<T> {
  return tallies.run(tally, fn)
}

/**
 * True when the caller is already inside a job that is counting requests.
 *
 * Helpers that log their own `sync_logs` row must check this first: counted twice,
 * once by themselves and once by the job that called them, they inflate the daily
 * total the budget guard is hydrated from.
 */
export function hasActiveTally(): boolean {
  return tallies.getStore() !== undefined
}

/**
 * The hard daily ceiling. API-Football's free plan allows 100 requests per day
 * and the counter resets around 00:00 UTC; going over does not just fail, it
 * fails for the rest of the day, so the app refuses to cross the line itself.
 *
 * The count is hydrated from `sync_logs` rather than kept purely in memory: on
 * free hosting the process restarts (or sleeps and wakes) several times a day,
 * and a fresh in-memory zero would cheerfully spend a second hundred.
 */
export class BudgetExhaustedError extends Error {
  constructor(used: number, limit: number) {
    super(`API-Football daily budget spent (${used}/${limit}); refusing further requests today`)
    this.name = 'BudgetExhaustedError'
  }
}

let budgetDay = ''
let budgetUsed = 0
// The in-flight hydration, tagged with the day it is hydrating FOR. A caller that
// arrives after a UTC rollover must not be satisfied by a hydration that started
// before it and is loading yesterday's total.
let hydration: { day: string; promise: Promise<void> } | null = null

// The UTC calendar day the API's own counter resets on.
function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

async function hydrateBudget(): Promise<void> {
  const day = utcDay()
  if (budgetDay === day) return
  if (!hydration || hydration.day !== day) {
    const promise = (async () => {
      const { rows } = await query<{ used: string }>(
        `SELECT COALESCE(SUM(api_requests_used), 0)::text AS used
         FROM sync_logs
         WHERE ran_at >= (date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc')`,
      )
      // Only a SUCCESSFUL read may claim the day. If the database is unreachable
      // the counter stays as it was and the next call retries — the alternative
      // (zeroing and marking the day done) would let one Neon blip at 00:05 wipe a
      // real spend of 90 and hand the rest of the day a fresh hundred.
      budgetUsed = Number(rows[0]?.used ?? 0)
      budgetDay = day
    })()
    hydration = { day, promise }
    promise
      .catch((err: unknown) => {
        logger.warn({ err }, 'Could not hydrate API budget from sync_logs; will retry')
      })
      .finally(() => {
        if (hydration?.promise === promise) hydration = null
      })
  }
  // A hydration failure must not take the caller down with it: the in-process
  // count is still a floor, and the request itself is about to be counted.
  await hydration.promise.catch(() => {})
}

export interface BudgetSnapshot {
  used: number
  limit: number
  remaining: number
  day: string
}

/** Today's API spend. Jobs check this before starting expensive work. */
export async function getBudget(): Promise<BudgetSnapshot> {
  await hydrateBudget()
  const limit = await getDailyLimit()
  return { used: budgetUsed, limit, remaining: Math.max(0, limit - budgetUsed), day: budgetDay }
}

const REQUEST_TIMEOUT_MS = 15_000

// Serialize requests with a minimum gap (derived from the plan's requests/min)
// so a burst — e.g. a multi-league backfill — never trips HTTP 429.
const MIN_REQUEST_GAP_MS = Math.ceil(60_000 / env.API_FOOTBALL_RPM)
let lastRequestAt = 0

// How long to wait after an HTTP 429, per retry. The first is a short breather
// for a brief collision; the second clears a whole per-minute window.
const RATE_LIMIT_BACKOFF_MS = [20_000, 65_000]

// Requests spent while retrying a 429 still count here, which slightly overstates
// the day's spend — the safe direction against a hard ceiling.

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
 * The request is fine but the PLAN will not serve it — the free plan refusing the
 * current season, or the daily quota being spent. API-Football reports both as
 * HTTP 200 with an empty response and an `errors.plan` / `errors.requests` note,
 * which is how nine days of missing results looked like nine days of successful
 * syncs. Treat it as the failure it is so it lands in sync_logs and the admin
 * health screen.
 */
export class ApiPlanError extends Error {
  constructor(path: string, detail: string) {
    super(`API-Football ${path} refused by plan: ${detail}`)
    this.name = 'ApiPlanError'
  }
}

function planRefusal(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return null
  const record = errors as Record<string, unknown>
  // 'access' is how a SUSPENDED account answers. Treating it as a plan refusal is
  // deliberate: whatever the cause, the safe response is to stop assuming a paid
  // allowance and fall back to the cheap strategy.
  for (const key of ['plan', 'requests', 'token', 'access'] as const) {
    if (record[key]) return `${key}: ${String(record[key])}`
  }
  return null
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

  // Hard stop before the plan's daily ceiling. Throwing here (rather than
  // letting the API return an error) keeps the failure legible in sync_logs and
  // stops a runaway loop from burning tomorrow's goodwill too.
  //
  // The ceiling comes from what /status last reported, not from a constant: when
  // Pro lapses the limit drops from 7500 to 100 the moment the plan probe runs,
  // with no redeploy. Carrying a stale 7500 into a free-plan day is how the
  // account was suspended the first time.
  const limit = await getDailyLimit()
  await hydrateBudget()
  if (budgetUsed >= limit) {
    throw new BudgetExhaustedError(budgetUsed, limit)
  }

  await throttle()

  const url = new URL(path.replace(/^\//, ''), `${env.API_FOOTBALL_BASE_URL}/`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  let res: Response | undefined
  // The per-minute allowance is separate from the daily one, and something else
  // can be spending it at the same time — the deployed app and a local script,
  // or the internal cron and the GitHub Actions trigger. A 429 is therefore a
  // wait, not a failure: without this one rejected request aborts the whole job
  // (a catch-up sweep losing seven of its ten days, say). Each attempt is
  // counted, which slightly over-counts — the safe direction on a hard cap.
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    requestCount += 1
    budgetUsed += 1
    const tally = tallies.getStore()
    if (tally) tally.count += 1
    try {
      res = await fetch(url, {
        headers: { 'x-apisports-key': env.API_FOOTBALL_KEY },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    logger.info({ path, params, requestCount, attempt }, 'API-Football request')

    if (res.status !== 429 || attempt >= RATE_LIMIT_BACKOFF_MS.length) break

    const wait = RATE_LIMIT_BACKOFF_MS[attempt]
    logger.warn({ path, attempt, wait }, 'API-Football rate limited; backing off')
    await new Promise((resolve) => setTimeout(resolve, wait))
    // Do not let the backoff double up with the throttle's own spacing.
    lastRequestAt = Date.now()
  }

  if (!res.ok) {
    throw new Error(`API-Football ${path} responded with HTTP ${res.status}`)
  }

  const body = (await res.json()) as ApiFootballEnvelope<T>
  // API-Football returns HTTP 200 with a non-empty errors object for several very
  // different situations. A plan refusal is fatal — no retry, no amount of budget,
  // will ever make it succeed — so it throws. Anything else (an odd parameter, a
  // transient note) is logged and the caller carries on.
  const refusal = planRefusal(body.errors)
  if (refusal) {
    logger.error({ path, params, errors: body.errors }, 'API-Football refused the request')
    // The earliest signal that the subscription has lapsed. Flip to the degraded
    // strategy now rather than waiting for the next daily probe — every request
    // between the two would be spent on endpoints that cannot answer.
    await markRestricted(refusal)
    throw new ApiPlanError(path, refusal)
  }
  if (hasErrors(body.errors)) {
    logger.warn({ path, errors: body.errors }, 'API-Football returned errors')
  }

  return body
}

export async function apiFootballGet<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const body = await apiFootballGetEnvelope<T>(path, params)
  return body.response
}
