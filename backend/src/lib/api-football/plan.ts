import { env } from '../../config/env'
import { query } from '../../db/pool'
import { logger } from '../logger'

/**
 * What the API-Football plan currently allows, held in `app_flags` so it survives
 * restarts and so a change takes effect WITHOUT a redeploy.
 *
 * This exists because the plan lapsing is not a hypothetical: it happened on
 * 2026-08-24, and because nothing noticed, the app spent six days calling
 * endpoints the free plan refuses — 150 to 880 requests a day against a limit of
 * 100 — until the account was suspended. The refusals arrive as HTTP 200 with an
 * empty list, so every one of those runs logged as a success.
 *
 * A daily probe of `/status` (one request) writes the plan name and the real
 * daily limit here; every job then reads THIS rather than assuming. When Pro
 * expires the next probe records the free tier, the ceiling drops to 100, the
 * expensive per-league sweeps stop being scheduled and the derived tables take
 * over — on their own, with no redeploy.
 */

export interface PlanState {
  /** Plan name as the API reports it: 'Free', 'Pro', … */
  plan: string
  /** requests.limit_day straight from /status — the real ceiling. */
  dailyLimit: number
  /**
   * True when league+season filters and the batched `ids` parameter are out of
   * reach — the Free plan, or any account currently being refused. It governs
   * how we FETCH. It does NOT decide whether to compute tables locally; that is
   * shouldDeriveTables(), which needs the stronger signal of a confirmed free
   * tier, because computing overwrites good data with worse.
   */
  restricted: boolean
  checkedAt: string | null
}

const FLAG_PLAN = 'api_plan'
const FLAG_LIMIT = 'api_daily_limit'
const FLAG_RESTRICTED = 'api_restricted'
const FLAG_CHECKED = 'api_plan_checked_at'

// Until the first probe lands we assume the WORSE plan. Guessing "Pro" and being
// wrong means blowing a 100-request budget before lunch; guessing "Free" and
// being wrong only means a few cheap jobs until the probe corrects it.
const UNKNOWN_PLAN: PlanState = {
  plan: 'unknown',
  dailyLimit: 100,
  restricted: true,
  checkedAt: null,
}

let cached: PlanState | null = null
let cachedAt = 0
const CACHE_MS = 60_000

/** Drop the memo so the next read hits the database. */
export function invalidatePlanCache(): void {
  cached = null
  cachedAt = 0
}

export async function getPlanState(): Promise<PlanState> {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached
  try {
    const { rows } = await query<{ key: string; value: string }>(
      'SELECT key, value FROM app_flags WHERE key = ANY($1)',
      [[FLAG_PLAN, FLAG_LIMIT, FLAG_RESTRICTED, FLAG_CHECKED]],
    )
    const flags = new Map(rows.map((r) => [r.key, r.value]))
    // No probe has ever run: fall back to the env ceiling rather than the
    // pessimistic default, so a fresh deployment behaves as configured.
    if (!flags.has(FLAG_PLAN)) {
      cached = {
        plan: 'unknown',
        dailyLimit: env.API_FOOTBALL_DAILY_LIMIT,
        restricted: env.DERIVE_FROM_RESULTS,
        checkedAt: null,
      }
    } else {
      const limit = Number(flags.get(FLAG_LIMIT))
      cached = {
        plan: flags.get(FLAG_PLAN) ?? 'unknown',
        dailyLimit: Number.isFinite(limit) && limit > 0 ? limit : env.API_FOOTBALL_DAILY_LIMIT,
        restricted: flags.get(FLAG_RESTRICTED) === 'on',
        checkedAt: flags.get(FLAG_CHECKED) ?? null,
      }
    }
    cachedAt = Date.now()
    return cached
  } catch (err) {
    logger.warn({ err }, 'Could not read plan state; assuming a restricted plan')
    return UNKNOWN_PLAN
  }
}

async function setFlag(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO app_flags (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  )
}

/** Record what `/status` just reported. */
export async function savePlanState(plan: string, dailyLimit: number): Promise<PlanState> {
  // Anything that is not the free tier can serve league+season and batched ids.
  const restricted = plan.trim().toLowerCase() === 'free'
  await setFlag(FLAG_PLAN, plan)
  await setFlag(FLAG_LIMIT, String(dailyLimit))
  await setFlag(FLAG_RESTRICTED, restricted ? 'on' : 'off')
  await setFlag(FLAG_CHECKED, new Date().toISOString())
  invalidatePlanCache()
  logger.info({ plan, dailyLimit, restricted }, 'API plan recorded')
  return { plan, dailyLimit, restricted, checkedAt: new Date().toISOString() }
}

/**
 * Flip to restricted immediately, without waiting for the next daily probe.
 *
 * Called when the API refuses a request on plan grounds. That refusal is the
 * earliest and most reliable signal that the subscription has lapsed — earlier
 * than the probe, and it costs nothing.
 */
export async function markRestricted(reason: string): Promise<void> {
  const state = await getPlanState()
  if (state.restricted) return
  logger.error({ reason }, 'API refused a request on plan grounds — switching to restricted mode')
  await setFlag(FLAG_RESTRICTED, 'on')
  // The ceiling has to come down with it: a lapsed plan means 100/day, and
  // carrying yesterday's 7500 into today is exactly how the account was
  // suspended the first time.
  await setFlag(FLAG_LIMIT, '100')
  invalidatePlanCache()
}

/**
 * Must we avoid league+season filters, batched ids and per-league sweeps?
 *
 * This governs how we FETCH, and it errs toward caution: a single plan refusal is
 * enough to turn it on, because continuing to call endpoints that are being
 * refused only burns quota.
 */
export async function isRestrictedPlan(): Promise<boolean> {
  if (env.DERIVE_FROM_RESULTS) return true
  return (await getPlanState()).restricted
}

/**
 * Should league tables and scorer leaderboards be COMPUTED from stored results
 * instead of fetched?
 *
 * Deliberately a higher bar than isRestrictedPlan(). Deriving overwrites data we
 * already hold with a worse version of it — three points a win, no point
 * deductions, no head-to-head tie-break — and on a plan that could have fetched
 * the real thing, that is destruction, not degradation. It cost the 2025 tables
 * once already.
 *
 * So a mere refusal is NOT enough: a suspended or rate-limited PAID account
 * refuses requests too, and reacting to that by rewriting the official tables
 * would turn an outage into permanent data loss. Only a probe that actually
 * reports the free tier — or the explicit override — unlocks it.
 */
export async function shouldDeriveTables(): Promise<boolean> {
  if (env.DERIVE_FROM_RESULTS) return true
  const state = await getPlanState()
  return state.plan.trim().toLowerCase() === 'free'
}

/** The real daily ceiling: what /status last reported, else the env value. */
export async function getDailyLimit(): Promise<number> {
  const state = await getPlanState()
  return state.checkedAt ? state.dailyLimit : env.API_FOOTBALL_DAILY_LIMIT
}
