import type { PoolClient } from 'pg'
import { getPool, query } from '../../../db/pool'
import { logger } from '../../../lib/logger'
import {
  apiFootballGet,
  apiFootballGetEnvelope,
  ApiPlanError,
  BudgetExhaustedError,
  apiFootballGetEnvelope as apiFootballEnvelope,
  getBudget,
  hasActiveTally,
  runWithTally,
} from '../../../lib/api-football/client'
import { isRestrictedPlan, savePlanState, shouldDeriveTables } from '../../../lib/api-football/plan'
import type {
  RawFixture,
  RawFixtureEvent,
  RawFixtureStatistic,
  RawPlayer,
  RawSquad,
  RawStandingsLeague,
  RawTopScorer,
  RawTransfer,
} from '../types'
import {
  CONFIGURED_LEAGUE_API_IDS,
  DERIVABLE_STANDINGS_API_IDS,
  DOMESTIC_CUP_API_IDS,
  GOAL_DETAIL_LEAGUE_API_IDS,
  MATCH_DETAIL_LEAGUE_API_IDS,
  seedLeagues,
  TOURNAMENT_API_IDS,
} from '../leagues.config'
import {
  collectTeams,
  replaceFixtureEvents,
  replaceFixtureGoals,
  replaceFixtureStats,
  replaceTopAssists,
  replaceTopScorers,
  upsertFixturesBatch,
  upsertPlayer,
  upsertStanding,
  upsertTeamsBatch,
} from './upserts'

export interface SyncResult {
  job: string
  success: boolean
  records: number
  requests: number
  /** Set when the job deliberately did not run — e.g. too little budget left. */
  skipped?: string
  error?: string
}

interface JobOptions {
  /**
   * Refuse to start unless at least this many requests are left in today's
   * budget. On 100 requests/day an optional job (top scorers) must never be
   * able to crowd out a load-bearing one (tonight's results).
   */
  minBudget?: number
}

interface ActiveLeague {
  id: number
  api_football_id: number
  season: number
}

// includeInactive=true also returns past (inactive) seasons — used only by the
// one-time backfill. The daily cron always stays on active leagues.
async function getLeagues(includeInactive = false): Promise<ActiveLeague[]> {
  const { rows } = await query<ActiveLeague>(
    includeInactive
      ? 'SELECT id, api_football_id, season FROM leagues ORDER BY id'
      : 'SELECT id, api_football_id, season FROM leagues WHERE is_active = true ORDER BY id',
  )
  return rows
}

async function logSync(
  job: string,
  records: number,
  requests: number,
  success: boolean,
  error: string | null,
): Promise<void> {
  try {
    await query(
      `INSERT INTO sync_logs (job_name, records_upserted, api_requests_used, success, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [job, records, requests, success, error],
    )
  } catch (err) {
    logger.error({ err, job }, 'Failed to write sync_logs')
  }
}

// Wraps a job: reset the request counter, run the work, record one sync_logs row.
// A failing job is logged and returned as unsuccessful — it never throws upward,
// so a broken API or exhausted budget cannot crash the app.
export async function runSyncJob(
  job: string,
  work: () => Promise<number>,
  opts: JobOptions = {},
): Promise<SyncResult> {
  if (!getPool()) {
    logger.error({ job }, 'DATABASE_URL not configured; skipping sync')
    return { job, success: false, records: 0, requests: 0, error: 'no database' }
  }
  if (opts.minBudget != null) {
    const budget = await getBudget()
    if (budget.remaining < opts.minBudget) {
      logger.warn(
        { job, need: opts.minBudget, ...budget },
        'Skipping sync — not enough API budget left today',
      )
      return { job, success: true, records: 0, requests: 0, skipped: 'budget' }
    }
  }
  // The tally counts only THIS job's requests, even while another sync is running
  // in the same process (the internal cron and the external trigger overlap). It
  // is what sync_logs records, and sync_logs is where tomorrow's budget is
  // hydrated from, so an undercount here would let the app spend past the cap.
  const tally = { count: 0 }
  try {
    const records = await runWithTally(tally, work)
    await logSync(job, records, tally.count, true, null)
    logger.info({ job, records, requests: tally.count }, 'Sync completed')
    return { job, success: true, records, requests: tally.count }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logSync(job, 0, tally.count, false, message)
    logger.error({ err, job }, 'Sync failed')
    return { job, success: false, records: 0, requests: tally.count, error: message }
  }
}

// Runs `fn` for each league in its own transaction, so one failing league does
// not roll back the others.
async function perLeague(
  leagues: ActiveLeague[],
  fn: (client: PoolClient, league: ActiveLeague) => Promise<number>,
): Promise<number> {
  let total = 0
  for (const league of leagues) {
    const client = await getPool()!.connect()
    // fn holds this client across a slow API round-trip; if Neon drops the idle
    // socket meanwhile the client emits 'error' with no listener (pg-pool removes
    // its own while checked out) → uncaughtException → whole-process crash. Guard
    // it, mirroring syncFixtureDetail / the live-events block.
    const onError = (err: unknown) =>
      logger.error({ err, league: league.api_football_id }, 'perLeague client error')
    client.on('error', onError)
    try {
      await client.query('BEGIN')
      total += await fn(client, league)
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      logger.error({ err, league: league.api_football_id }, 'League sync failed; rolled back')
      // Out of daily budget, or the plan won't serve this season: every
      // remaining league fails identically, so stop instead of logging the same
      // error fifty times (and, for the budget case, spending fifty requests).
      if (err instanceof BudgetExhaustedError || err instanceof ApiPlanError) break
    } finally {
      client.off('error', onError)
      client.release()
    }
  }
  return total
}

interface RawStatus {
  subscription?: { plan?: string; end?: string; active?: boolean }
  requests?: { current?: number; limit_day?: number }
}

/**
 * Probe the plan and record what it allows. ONE request a day, and the cheapest
 * insurance in this codebase.
 *
 * Without it, a lapsed subscription is invisible: the refused calls come back as
 * HTTP 200 with an empty list, so they log as successful syncs while the data
 * quietly rots and the daily quota is spent on endpoints that cannot answer. That
 * is exactly what happened for six days in August 2026, ending in a suspended
 * account. When Pro expires this flips the app to the free-plan strategy — lower
 * ceiling, date-keyed fetches, derived tables — with no redeploy.
 */
export async function syncPlanStatus(): Promise<SyncResult> {
  return runSyncJob('plan', async () => {
    const body = await apiFootballEnvelope<RawStatus>('status')
    const plan = body.response?.subscription?.plan
    const limit = body.response?.requests?.limit_day
    if (!plan || !limit) {
      // No usable answer (suspended, or the key is wrong). Assume the worst: the
      // client's refusal handler has already flipped us to restricted, and
      // guessing "paid" here would undo that.
      logger.error({ errors: body.errors }, 'Plan probe returned no subscription — staying cautious')
      return 0
    }
    const state = await savePlanState(plan, limit)
    if (body.response?.subscription?.end) {
      logger.info({ plan, ends: body.response.subscription.end }, 'Subscription window')
    }
    return state.restricted ? 1 : 2
  })
}

/** Seed the configured leagues into the DB (no API requests). */
export async function seedLeaguesJob(): Promise<SyncResult> {
  return runSyncJob('seed', async () => {
    const client = await getPool()!.connect()
    try {
      return await seedLeagues(client)
    } finally {
      client.release()
    }
  })
}

// A UTC calendar date `offset` days from now, as YYYY-MM-DD. API-Football's
// `date` filter is UTC and every kickoff_at we store is UTC, so the two agree
// without any timezone arithmetic.
function utcDate(offset = 0): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

// The free plan serves the `date` filter only for a ROLLING THREE-DAY WINDOW —
// yesterday, today, tomorrow. Ask for anything else and it answers "Free plans do
// not have access to this date, try from <yesterday> to <tomorrow>". Offsets are
// clamped to this rather than trusted, so a caller cannot silently kill a sweep
// halfway through by asking for one day too many.
const FREE_PLAN_DATE_MIN = -1
const FREE_PLAN_DATE_MAX = 1

function datesInReach(offsets: number[]): string[] {
  const usable = offsets.filter((o) => o >= FREE_PLAN_DATE_MIN && o <= FREE_PLAN_DATE_MAX)
  const dropped = offsets.length - usable.length
  if (dropped > 0) {
    logger.warn(
      { offsets, kept: usable },
      'Dropped date offsets outside the plan\'s three-day window; use syncMissedFixtures for older days',
    )
  }
  return [...new Set(usable.map(utcDate))]
}

// (api_football_id, season) -> our leagues.id, for turning a worldwide fixtures
// response back into the rows we own.
async function getLeagueIndex(): Promise<Map<string, number>> {
  const { rows } = await query<ActiveLeague>(
    'SELECT id, api_football_id, season FROM leagues WHERE is_active = true',
  )
  return new Map(rows.map((l) => [`${l.api_football_id}:${l.season}`, l.id]))
}

// Group a mixed-league fixtures response by our league id and upsert each group
// in its own short transaction. The API call is already finished by the time we
// get here, so no pooled connection is ever held across a network round-trip.
async function upsertFixturesByLeague(
  index: Map<string, number>,
  fixtures: RawFixture[],
): Promise<number> {
  const byLeague = new Map<number, RawFixture[]>()
  for (const f of fixtures) {
    const leagueId = index.get(`${f.league.id}:${f.league.season}`)
    if (!leagueId) continue
    const bucket = byLeague.get(leagueId)
    if (bucket) bucket.push(f)
    else byLeague.set(leagueId, [f])
  }

  let total = 0
  for (const [leagueId, list] of byLeague) {
    const client = await getPool()!.connect()
    const onError = (err: unknown) => logger.error({ err, leagueId }, 'fixtures-by-date client error')
    client.on('error', onError)
    try {
      await client.query('BEGIN')
      const teamIds = await upsertTeamsBatch(client, collectTeams(list))
      total += await upsertFixturesBatch(client, leagueId, list, teamIds)
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      logger.error({ err, leagueId }, 'Fixture upsert failed; rolled back')
    } finally {
      client.off('error', onError)
      client.release()
    }
  }
  return total
}

/**
 * ONE request per date returns every match played anywhere on that UTC day; we
 * keep the ones in our configured league-seasons and drop the rest.
 *
 * This is the single biggest saving of the free-plan rework. The per-league jobs
 * below spend one request per league-season — 51 of them — to learn exactly what
 * this learns in one. Filtering client-side costs nothing; requests cost
 * everything.
 */
async function syncFixturesByDate(job: string, offsets: number[]): Promise<SyncResult> {
  const dates = datesInReach(offsets)
  return runSyncJob(
    job,
    async () => {
      if (dates.length === 0) return 0
      const index = await getLeagueIndex()
      let total = 0
      for (const date of dates) {
        const fixtures = await apiFootballGet<RawFixture[]>('fixtures', { date })
        total += await upsertFixturesByLeague(index, fixtures)
      }
      return total
    },
    { minBudget: Math.max(1, dates.length) },
  )
}

/**
 * Today's scores — the hourly job, 1 request. Replaces the old per-league
 * per-league results job, which spent ~50 requests a run to be refused by the plan.
 */
export async function syncTodayResults(): Promise<SyncResult> {
  return syncFixturesByDate('results', [0])
}

// One request per fixture, so the backlog drainer is bounded exactly like the
// goal-detail job: a per-run cap and a floor of requests reserved for the scores.
const MISSED_PER_RUN = 4
const MISSED_BUDGET_FLOOR = 30

/**
 * Fill in matches whose result was never recorded — one request each, oldest
 * check first.
 *
 * This exists because the free plan leaves no cheap way back. The `date` filter
 * only reaches yesterday, `ids` (twenty fixtures a request) is refused outright
 * ("Free plans do not have access to the Ids parameter"), and league+season is
 * season-gated. A single `fixtures?id=` is the only door left, so a backlog is
 * drained slowly rather than swept.
 *
 * Bounds worth knowing:
 *  - Group fixtures first: a match somebody predicted must settle before anything
 *    else is worth a request.
 *  - Only the last 30 days. Beyond that a fixture is abandoned or was never going
 *    to resolve, and re-fetching it forever would cost a request a day for good.
 *  - Ordered by least-recently-checked, and skipping anything already checked in
 *    the last two hours, so a permanently stuck fixture cannot monopolise the run.
 */
export async function syncMissedFixtures(limit = MISSED_PER_RUN): Promise<SyncResult> {
  return runSyncJob(
    'missed-fixtures',
    async () => {
      const budget = await getBudget()
      const take = Math.min(limit, Math.max(0, budget.remaining - MISSED_BUDGET_FLOOR))
      if (take === 0) return 0

      const { rows } = await query<{ api_football_id: number }>(
        `SELECT f.api_football_id,
                EXISTS (SELECT 1 FROM group_fixtures gf WHERE gf.fixture_id = f.id) AS is_group
         FROM fixtures f JOIN leagues l ON l.id = f.league_id
         WHERE l.is_active
           AND f.kickoff_at < now() - interval '3 hours'
           AND f.kickoff_at > now() - interval '30 days'
           AND f.updated_at < now() - interval '2 hours'
           AND f.status NOT IN ('FT','AET','PEN','PST','CANC','ABD','AWD','WO')
         ORDER BY is_group DESC, f.updated_at ASC
         LIMIT $1`,
        [take],
      )
      if (rows.length === 0) return 0

      const index = await getLeagueIndex()
      let total = 0
      for (const r of rows) {
        const fixtures = await apiFootballGet<RawFixture[]>('fixtures', { id: r.api_football_id })
        total += await upsertFixturesByLeague(index, fixtures)
      }
      return total
    },
    { minBudget: MISSED_BUDGET_FLOOR + 1 },
  )
}

export async function syncScheduleWindow(): Promise<SyncResult> {
  return syncFixturesByDate('schedule', [-1, 1])
}

// Only the round-robin part of a competition belongs in its table. API-Football
// files promotion/relegation play-offs and end-of-season knockouts under the SAME
// league id, and counting them does two kinds of damage: it inflates played and
// points (Championship clubs showing 48 games in a 46-game league), and it drags
// clubs from the division below into the table via the relegation play-off.
const REGULAR_SEASON_ROUND = "round ILIKE 'Regular Season%'"

// Statuses that put a result on the board. AWD/WO are awarded matches — they were
// never played but they count, and dropping them leaves both clubs a game short.
// PEN cannot occur in a regular-season round (it is a knockout ending) and is
// excluded by the round filter anyway.
const TABLE_STATUSES = ['FT', 'AET', 'AWD', 'WO']

/**
 * Recompute one league's table from the fixtures we already store. ZERO API
 * requests — and on the free plan that is the only way to have a table at all,
 * since `standings?league=X&season=2026` is refused outright while the results
 * those standings are made of come through `fixtures?date=` just fine.
 *
 * Ranking mirrors the usual league rules: points, then goal difference, then goals
 * scored, within each group_label so a competition split into conferences (MLS)
 * stays split.
 *
 * Two things it will NOT get right, because neither is derivable from results:
 * point deductions, and leagues that separate equal teams on head-to-head rather
 * than goal difference. A table with a deducted club will read a few points high.
 */
export async function rebuildStandingsForLeague(
  client: PoolClient,
  leagueId: number,
): Promise<number> {
  const res = await client.query(
    `WITH counted AS (
       SELECT f.home_team_id, f.away_team_id, f.home_score, f.away_score, f.kickoff_at
       FROM fixtures f
       WHERE f.league_id = $1
         AND f.${REGULAR_SEASON_ROUND}
         AND f.status = ANY($2)
         AND f.home_score IS NOT NULL AND f.away_score IS NOT NULL
     ),
     played AS (
       SELECT home_team_id AS team_id, home_score AS gf, away_score AS ga, kickoff_at FROM counted
       UNION ALL
       SELECT away_team_id, away_score, home_score, kickoff_at FROM counted
     ),
     agg AS (
       SELECT team_id,
         count(*)::int AS played,
         count(*) FILTER (WHERE gf > ga)::int AS won,
         count(*) FILTER (WHERE gf = ga)::int AS drawn,
         count(*) FILTER (WHERE gf < ga)::int AS lost,
         COALESCE(sum(gf), 0)::int AS goals_for,
         COALESCE(sum(ga), 0)::int AS goals_against,
         (3 * count(*) FILTER (WHERE gf > ga) + count(*) FILTER (WHERE gf = ga))::int AS points
       FROM played GROUP BY team_id
     ),
     -- Who belongs in this table: every club with a regular-season fixture in this
     -- league-season, played or not. Defining the roster from the FIXTURES rather
     -- than from the existing standings rows is what keeps a play-off visitor from
     -- the division below out, while still listing a club that has yet to kick off.
     roster AS (
       SELECT DISTINCT home_team_id AS team_id FROM fixtures
       WHERE league_id = $1 AND ${REGULAR_SEASON_ROUND}
       UNION
       SELECT DISTINCT away_team_id FROM fixtures
       WHERE league_id = $1 AND ${REGULAR_SEASON_ROUND}
     ),
     tally AS (
       SELECT r.team_id,
         COALESCE(a.played, 0) AS played,
         COALESCE(a.won, 0) AS won,
         COALESCE(a.drawn, 0) AS drawn,
         COALESCE(a.lost, 0) AS lost,
         COALESCE(a.goals_for, 0) AS goals_for,
         COALESCE(a.goals_against, 0) AS goals_against,
         COALESCE(a.points, 0) AS points
       FROM roster r LEFT JOIN agg a ON a.team_id = r.team_id
     ),
     -- Last five results, oldest-to-newest, in the same "WWDLW" shape the API used.
     recent AS (
       SELECT team_id, string_agg(res, '' ORDER BY kickoff_at) AS form
       FROM (
         SELECT team_id, kickoff_at,
           CASE WHEN gf > ga THEN 'W' WHEN gf = ga THEN 'D' ELSE 'L' END AS res,
           row_number() OVER (PARTITION BY team_id ORDER BY kickoff_at DESC) AS rn
         FROM played
       ) t WHERE rn <= 5 GROUP BY team_id
     ),
     -- group_label cannot be derived from results, so it is carried from the row
     -- we already have. When the whole competition uses ONE label (a plain league)
     -- a newcomer inherits it; when it genuinely has several (MLS conferences) a
     -- club we have no label for is left out rather than invented into a group of
     -- its own — an unlabelled row renders as a phantom extra mini-table.
     label AS (
       SELECT count(DISTINCT group_label)::int AS n_labels,
              CASE WHEN count(DISTINCT group_label) = 1 THEN min(group_label) END AS only_label
       FROM standings WHERE league_id = $1 AND group_label IS NOT NULL
     ),
     ranked AS (
       SELECT tl.*, rc.form,
         COALESCE(st.group_label, lb.only_label) AS group_label,
         lb.n_labels,
         row_number() OVER (
           PARTITION BY COALESCE(st.group_label, lb.only_label)
           ORDER BY tl.points DESC, (tl.goals_for - tl.goals_against) DESC,
                    tl.goals_for DESC, tl.team_id
         )::int AS position
       FROM tally tl
       CROSS JOIN label lb
       LEFT JOIN recent rc ON rc.team_id = tl.team_id
       LEFT JOIN standings st ON st.league_id = $1 AND st.team_id = tl.team_id
     )
     INSERT INTO standings (
       league_id, team_id, position, played, won, drawn, lost,
       goals_for, goals_against, points, form, group_label
     )
     SELECT $1, team_id, position, played, won, drawn, lost,
            goals_for, goals_against, points, form, group_label
     FROM ranked
     WHERE n_labels <= 1 OR group_label IS NOT NULL
     ON CONFLICT (league_id, team_id) DO UPDATE SET
       position = EXCLUDED.position,
       played = EXCLUDED.played,
       won = EXCLUDED.won,
       drawn = EXCLUDED.drawn,
       lost = EXCLUDED.lost,
       goals_for = EXCLUDED.goals_for,
       goals_against = EXCLUDED.goals_against,
       points = EXCLUDED.points,
       form = EXCLUDED.form,
       group_label = EXCLUDED.group_label,
       updated_at = now()`,
    [leagueId, TABLE_STATUSES],
  )

  // Evict anyone with no regular-season fixture here at all — a club that only
  // ever appeared in this league's play-off, which an earlier rebuild wrongly
  // seated in the table.
  await client.query(
    `DELETE FROM standings s
     WHERE s.league_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM fixtures f
         WHERE f.league_id = $1 AND f.${REGULAR_SEASON_ROUND}
           AND (f.home_team_id = s.team_id OR f.away_team_id = s.team_id)
       )`,
    [leagueId],
  )
  return res.rowCount ?? 0
}

/**
 * Rebuild the derivable league tables from stored results. Costs NOTHING, so it
 * runs right after each results sync — the table is never staler than the scores
 * it is made of.
 *
 * By default only SEASONS STILL IN PROGRESS are touched. A finished season's table
 * was fetched from the API while the subscription was live, and that version knows
 * about point deductions and head-to-head tie-breaks that a rebuild cannot; since
 * the free plan refuses `standings` for any recent season, overwriting it destroys
 * something unrecoverable. `includeFinished` exists only to repair a season a
 * previous rebuild already damaged.
 */
export async function rebuildStandings(includeFinished = false): Promise<SyncResult> {
  return runSyncJob('standings-derived', async () => {
    // Hard guard, not just a scheduling choice. This job overwrites the standings
    // table, so on a plan that CAN fetch the real one it must never run by
    // accident — an admin click, a stale cron entry, a leftover line in
    // sync.yml. It already destroyed the 2025 tables once.
    if (!(await shouldDeriveTables())) {
      logger.warn(
        { job: 'standings-derived' },
        'Plan can fetch real standings — refusing to overwrite them with derived ones',
      )
      return 0
    }
    const { rows } = await query<{ id: number }>(
      `SELECT l.id FROM leagues l
       WHERE l.is_active = true
         AND l.api_football_id = ANY($1)
         -- Never rebuild a competition whose rounds we cannot recognise: the
         -- regular-season filter would match nothing and the eviction below would
         -- then empty its table.
         AND EXISTS (
           SELECT 1 FROM fixtures f WHERE f.league_id = l.id AND f.${REGULAR_SEASON_ROUND}
         )
         AND ($2 OR EXISTS (
           SELECT 1 FROM fixtures f WHERE f.league_id = l.id AND f.kickoff_at > now()
         ))
       ORDER BY l.id`,
      [DERIVABLE_STANDINGS_API_IDS, includeFinished],
    )
    let total = 0
    for (const league of rows) {
      const client = await getPool()!.connect()
      const onError = (err: unknown) =>
        logger.error({ err, leagueId: league.id }, 'standings-derived client error')
      client.on('error', onError)
      try {
        await client.query('BEGIN')
        total += await rebuildStandingsForLeague(client, league.id)
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        logger.error({ err, leagueId: league.id }, 'Standings rebuild failed; rolled back')
      } finally {
        client.off('error', onError)
        client.release()
      }
    }
    return total
  })
}

/**
 * Fill `fixture_goals` from the event feeds we ALREADY hold. Zero API requests.
 *
 * `syncFixtureDetail` has always written the full `fixture_events` feed but never
 * the lightweight goal list beside it — only the live sync did that — so the
 * database ended up with ~14k matches of events and a few dozen matches of
 * goals. Every "who scored" line and the whole derived top-scorer list reads
 * `fixture_goals`, which is why both looked empty while the data sat right there.
 *
 * The pending fixtures are listed ONCE and then inserted in chunks, rather than
 * re-queried until the list comes back empty. That matters: a fixture whose only
 * goal events carry a NULL player_name or team_api_id writes no rows at all, so a
 * re-query loop would keep selecting it forever.
 */
export async function backfillGoalsFromEvents(maxFixtures = 50000): Promise<SyncResult> {
  return runSyncJob('goals-from-events', async () => {
    const { rows } = await query<{ id: number }>(
      `SELECT DISTINCT e.fixture_id AS id
       FROM fixture_events e
       WHERE e.type = 'Goal'
         AND NOT EXISTS (SELECT 1 FROM fixture_goals g WHERE g.fixture_id = e.fixture_id)
       LIMIT $1`,
      [maxFixtures],
    )
    const pending = rows.map((r) => r.id)
    if (pending.length === 0) return 0

    const CHUNK = 500
    let total = 0
    for (let i = 0; i < pending.length; i += CHUNK) {
      const ids = pending.slice(i, i + CHUNK)
      // Mirrors replaceFixtureGoals: every 'Goal' event except a missed penalty,
      // and only rows complete enough for the NOT NULL columns.
      const res = await query(
        `INSERT INTO fixture_goals
           (fixture_id, team_api_id, player_name, assist_name, minute, detail)
         SELECT e.fixture_id, e.team_api_id, e.player_name, e.assist_name, e.minute, e.detail
         FROM fixture_events e
         WHERE e.fixture_id = ANY($1)
           AND e.type = 'Goal'
           AND e.detail IS DISTINCT FROM 'Missed Penalty'
           AND e.team_api_id IS NOT NULL
           AND e.player_name IS NOT NULL`,
        [ids],
      )
      total += res.rowCount ?? 0
    }
    logger.info({ fixtures: pending.length, goals: total }, 'Derived goal rows from stored events')
    return total
  })
}

/**
 * Rebuild the scorer and assist leaderboards from stored goals. Zero API
 * requests — and, like the league tables, the only way to have current ones:
 * `players/topscorers` is filtered by league+season, which the free plan refuses
 * for 2026.
 *
 * Only ACTIVE league-seasons are touched. Past seasons keep the lists fetched
 * back when the subscription was live, which are richer (they carry appearances,
 * which cannot be derived from goals) and would only be degraded by a rebuild.
 * A league with no goal rows at all is skipped rather than emptied.
 *
 * Players are grouped by name, because rows derived from historical events have
 * no player id; an id is attached wherever any of that player's goals carries
 * one. Two players sharing a name inside one league-season would merge — rare
 * enough to accept, and it corrects itself as id-carrying rows accumulate.
 */
export async function rebuildScorerLists(): Promise<SyncResult> {
  return runSyncJob('scorers-derived', async () => {
    // Same guard as rebuildStandings: the fetched lists carry `appearances`,
    // which cannot be derived, so replacing them is a downgrade.
    if (!(await shouldDeriveTables())) {
      logger.warn(
        { job: 'scorers-derived' },
        'Plan can fetch real scorer lists — refusing to overwrite them with derived ones',
      )
      return 0
    }
    const { rows: leagues } = await query<{ id: number }>(
      `SELECT l.id FROM leagues l
       WHERE l.is_active = true
         AND EXISTS (
           SELECT 1 FROM fixture_goals g JOIN fixtures f ON f.id = g.fixture_id
           WHERE f.league_id = l.id
         )
       ORDER BY l.id`,
    )
    let total = 0
    for (const league of leagues) {
      const client = await getPool()!.connect()
      const onError = (err: unknown) =>
        logger.error({ err, leagueId: league.id }, 'scorers-derived client error')
      client.on('error', onError)
      try {
        await client.query('BEGIN')
        total += await rebuildScorersForLeague(client, league.id)
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        logger.error({ err, leagueId: league.id }, 'Scorer rebuild failed; rolled back')
      } finally {
        client.off('error', onError)
        client.release()
      }
    }
    return total
  })
}

// How many players each derived leaderboard keeps. The API used to return ~20;
// a few more costs nothing and makes the page worth scrolling.
const SCORER_LIST_SIZE = 40

async function rebuildScorersForLeague(client: PoolClient, leagueId: number): Promise<number> {
  // Delete-then-insert, not upsert: top_scorers is UNIQUE (league_id, rank), so
  // shifting ranks would collide on the way through.
  await client.query('DELETE FROM top_scorers WHERE league_id = $1', [leagueId])
  const scorers = await client.query(
    `WITH scored AS (
       SELECT g.player_name, g.player_api_id, g.team_api_id, g.detail
       FROM fixture_goals g JOIN fixtures f ON f.id = g.fixture_id
       WHERE f.league_id = $1
         AND f.status IN ('FT','AET','PEN','AWD','WO')
         -- An own goal counts for the opposing team, never for the scorer.
         AND g.detail IS DISTINCT FROM 'Own Goal'
         AND g.player_name IS NOT NULL AND g.player_name <> ''
         -- A shootout is not scoring. API-Football files every shootout kick as an
         -- ordinary 'Penalty' goal stamped at minute 120, so a 1-1 draw arrives
         -- carrying 29 goal rows; counted, they wreck the leaderboard. Drop them,
         -- accepting that a genuine penalty in the 120th minute goes with them.
         AND NOT (f.status = 'PEN' AND g.detail = 'Penalty' AND g.minute >= 120)
     ),
     tally AS (
       SELECT player_name,
         max(player_api_id) AS player_api_id,
         -- Most frequent club, so a mid-season transfer lands on the right badge.
         mode() WITHIN GROUP (ORDER BY team_api_id) AS team_api_id,
         count(*)::int AS goals,
         count(*) FILTER (WHERE detail = 'Penalty')::int AS penalties
       FROM scored GROUP BY player_name
     ),
     ranked AS (
       SELECT t.*,
         row_number() OVER (ORDER BY t.goals DESC, t.penalties ASC, t.player_name)::int AS rank
       FROM tally t
     )
     INSERT INTO top_scorers
       (league_id, player_name, player_api_id, team_id, goals, penalties, appearances, rank)
     SELECT $1, r.player_name, r.player_api_id, tm.id, r.goals, r.penalties, NULL, r.rank
     FROM ranked r LEFT JOIN teams tm ON tm.api_football_id = r.team_api_id
     WHERE r.rank <= $2`,
    [leagueId, SCORER_LIST_SIZE],
  )

  await client.query('DELETE FROM top_assists WHERE league_id = $1', [leagueId])
  const assists = await client.query(
    `WITH assisted AS (
       SELECT g.assist_name AS player_name, g.assist_api_id AS player_api_id, g.team_api_id
       FROM fixture_goals g JOIN fixtures f ON f.id = g.fixture_id
       WHERE f.league_id = $1
         AND f.status IN ('FT','AET','PEN','AWD','WO')
         AND g.detail IS DISTINCT FROM 'Own Goal'
         AND g.assist_name IS NOT NULL AND g.assist_name <> ''
         AND NOT (f.status = 'PEN' AND g.detail = 'Penalty' AND g.minute >= 120)
     ),
     tally AS (
       SELECT player_name,
         max(player_api_id) AS player_api_id,
         mode() WITHIN GROUP (ORDER BY team_api_id) AS team_api_id,
         count(*)::int AS assists
       FROM assisted GROUP BY player_name
     ),
     ranked AS (
       SELECT t.*, row_number() OVER (ORDER BY t.assists DESC, t.player_name)::int AS rank
       FROM tally t
     )
     INSERT INTO top_assists
       (league_id, player_name, player_api_id, team_id, assists, appearances, rank)
     SELECT $1, r.player_name, r.player_api_id, tm.id, r.assists, NULL, r.rank
     FROM ranked r LEFT JOIN teams tm ON tm.api_football_id = r.team_api_id
     WHERE r.rank <= $2`,
    [leagueId, SCORER_LIST_SIZE],
  )
  return (scorers.rowCount ?? 0) + (assists.rowCount ?? 0)
}

/**
 * Leagues whose table and lists could actually have moved: an active
 * league-season with a match that kicked off and finished inside the window,
 * most recent first. A league that did not play cannot have a new standing, so
 * re-fetching it is pure waste — and on 100 requests/day waste is the problem.
 * Knockout cups are excluded: they have a bracket, not a table.
 */
async function leaguesPlayedRecently(limit: number, hours = 36): Promise<ActiveLeague[]> {
  const { rows } = await query<ActiveLeague>(
    `SELECT l.id, l.api_football_id, l.season, MAX(f.kickoff_at) AS last_played
     FROM leagues l JOIN fixtures f ON f.league_id = l.id
     WHERE l.is_active = true
       AND NOT (l.api_football_id = ANY($1))
       AND f.status IN ('FT','AET','PEN')
       AND f.kickoff_at > now() - make_interval(hours => $2::int)
     GROUP BY l.id, l.api_football_id, l.season
     ORDER BY last_played DESC
     LIMIT $3`,
    [DOMESTIC_CUP_API_IDS, hours, limit],
  )
  return rows
}

// ---------------------------------------------------------------------------
// PER-LEAGUE SWEEPS — one request PER league-season (~50 of them) and filtered by
// league+season, which the FREE plan refuses for the current season: they cost ~50
// requests to return nothing. Off every cron; kept for a future paid plan, and for
// the past seasons (2022-2024) the free plan does still serve.
//
// (syncResults, the per-league per-day variant, was deleted outright — the hourly
// syncTodayResults does the same job in ONE request and actually works.)
// ---------------------------------------------------------------------------

export async function syncFixtures(includeInactive = false): Promise<SyncResult> {
  return runSyncJob('fixtures', async () => {
    const leagues = await getLeagues(includeInactive)
    return perLeague(leagues, async (client, league) => {
      const fixtures = await apiFootballGet<RawFixture[]>('fixtures', {
        league: league.api_football_id,
        season: league.season,
      })
      const teamIds = await upsertTeamsBatch(client, collectTeams(fixtures))
      return upsertFixturesBatch(client, league.id, fixtures, teamIds)
    })
  })
}

// One request each. Shared by the cheap daily jobs (which pass only the leagues
// that just played) and the manual full/backfill jobs below.
async function standingsForLeague(client: PoolClient, league: ActiveLeague): Promise<number> {
  const data = await apiFootballGet<RawStandingsLeague[]>('standings', {
    league: league.api_football_id,
    season: league.season,
  })
  const groups = data[0]?.league.standings ?? []
  let n = 0
  for (const group of groups) {
    for (const row of group) {
      await upsertStanding(client, league.id, row)
      n += 1
    }
  }
  return n
}

async function topScorersForLeague(client: PoolClient, league: ActiveLeague): Promise<number> {
  const scorers = await apiFootballGet<RawTopScorer[]>('players/topscorers', {
    league: league.api_football_id,
    season: league.season,
  })
  return replaceTopScorers(client, league.id, scorers)
}

async function topAssistsForLeague(client: PoolClient, league: ActiveLeague): Promise<number> {
  const assisters = await apiFootballGet<RawTopScorer[]>('players/topassists', {
    league: league.api_football_id,
    season: league.season,
  })
  return replaceTopAssists(client, league.id, assisters)
}

// How many leagues the daily jobs may refresh. Each league is one request, so
// these numbers ARE the budget line for standings and scorer lists.
const STANDINGS_MAX_LEAGUES = 8
const SCORERS_MAX_LEAGUES = 3

/**
 * League tables for leagues that have just played. `hours` is how far back to
 * look: a few hours for the hourly top-up, a day and a half for a daily pass.
 * A table cannot move unless its league played, so this is the whole trick.
 */
export async function syncStandingsForRecentMatches(
  limit = STANDINGS_MAX_LEAGUES,
  hours = 36,
): Promise<SyncResult> {
  return runSyncJob(
    'standings',
    async () => perLeague(await leaguesPlayedRecently(limit, hours), standingsForLeague),
    { minBudget: 3 },
  )
}

/** Daily scorer list for the few leagues that played most recently. */
export async function syncTopScorersForRecentMatches(
  limit = SCORERS_MAX_LEAGUES,
): Promise<SyncResult> {
  return runSyncJob(
    'topscorers',
    async () => perLeague(await leaguesPlayedRecently(limit), topScorersForLeague),
    { minBudget: 10 },
  )
}

/** Daily assist list for the few leagues that played most recently. */
export async function syncTopAssistsForRecentMatches(
  limit = SCORERS_MAX_LEAGUES,
): Promise<SyncResult> {
  return runSyncJob(
    'topassists',
    async () => perLeague(await leaguesPlayedRecently(limit), topAssistsForLeague),
    { minBudget: 10 },
  )
}

// Full-sweep variants of the three jobs above. Same caveat as syncFixtures.
export async function syncStandings(includeInactive = false): Promise<SyncResult> {
  return runSyncJob('standings-full', async () =>
    perLeague(await getLeagues(includeInactive), standingsForLeague),
  )
}

export async function syncTopScorers(includeInactive = false): Promise<SyncResult> {
  return runSyncJob('topscorers-full', async () =>
    perLeague(await getLeagues(includeInactive), topScorersForLeague),
  )
}

export async function syncTopAssists(includeInactive = false): Promise<SyncResult> {
  return runSyncJob('topassists-full', async () =>
    perLeague(await getLeagues(includeInactive), topAssistsForLeague),
  )
}

/**
 * Live scores. One request (`fixtures?live=all`) returns every in-progress match;
 * we update the ones we already track. Skips the API entirely when nothing could
 * be live, so it costs zero requests off match days.
 */
const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'SUSP', 'INT']

async function updateFixtureFromRaw(raw: RawFixture): Promise<{ id: number } | null> {
  const res = await query<{ id: number }>(
    `UPDATE fixtures SET status = $2, home_score = $3, away_score = $4,
       halftime_home = $5, halftime_away = $6, elapsed = $7,
       penalty_home = $8, penalty_away = $9, updated_at = now()
     WHERE api_football_id = $1 RETURNING id`,
    [
      raw.fixture.id,
      raw.fixture.status.short,
      raw.goals.home,
      raw.goals.away,
      raw.score.halftime.home,
      raw.score.halftime.away,
      raw.fixture.status.elapsed,
      raw.score.penalty?.home ?? null,
      raw.score.penalty?.away ?? null,
    ],
  )
  return res.rowCount ? res.rows[0] : null
}

/**
 * Re-read specific fixtures from the API, one request each.
 *
 * This used to batch twenty ids into a single `fixtures?ids=` call, which the free
 * plan refuses outright ("Free plans do not have access to the Ids parameter").
 * Singular `fixtures?id=` is allowed, so the same work now costs one request per
 * fixture — which is why every caller passes a hard cap.
 */
async function refetchFixtures(apiIds: number[]): Promise<number> {
  let updated = 0
  // `ids` (twenty per request) is a paid-plan parameter — the free plan answers
  // "Free plans do not have access to the Ids parameter". DERIVE_FROM_RESULTS is
  // the flag that says we are on that restricted plan, so it also picks the
  // fetch shape here: twenty at a time when we may, one at a time when we may not.
  const batchSize = (await isRestrictedPlan()) ? 1 : 20
  for (let i = 0; i < apiIds.length; i += batchSize) {
    const batch = apiIds.slice(i, i + batchSize)
    const raws =
      batch.length === 1
        ? await apiFootballGet<RawFixture[]>('fixtures', { id: batch[0] })
        : await apiFootballGet<RawFixture[]>('fixtures', { ids: batch.join('-') })
    for (const raw of raws) {
      if (await updateFixtureFromRaw(raw)) updated += 1
    }
  }
  return updated
}

// Guard so a slow live run (many concurrent matches × one events request each,
// serialised by the RPM throttle) can't overlap the next 2-minute cron tick and
// double-fetch the same events. If a run is still in flight, this tick no-ops.
let liveSyncRunning = false

export async function syncLiveScores(): Promise<SyncResult> {
  if (liveSyncRunning) {
    logger.info({ job: 'live' }, 'Previous live sync still running — skipping this tick')
    return { job: 'live', success: true, records: 0, requests: 0 }
  }
  liveSyncRunning = true
  try {
    return await runLiveScores()
  } finally {
    liveSyncRunning = false
  }
}

async function runLiveScores(): Promise<SyncResult> {
  return runSyncJob('live', async () => {
    // ONLY the matches that are in a group game AND have kicked off but aren't
    // final yet. We broadcast live scores solely for matches people are actually
    // predicting — never the whole world's fixtures — to stay within the API
    // budget. (This is the "sadece gruptaki maçlar" rule.)
    // Group matches that kicked off within the last 5h and are EITHER still live,
    // OR marked finished but with an implausibly low elapsed — a premature "FT" the
    // API occasionally emits mid-match. We re-check the latter so a live match that
    // briefly flipped to FT heals itself: otherwise it freezes forever (the live
    // sync normally skips finished matches) and settles on the wrong partial score.
    // A genuine full-time (elapsed ~90, or null) is left alone — no wasted requests.
    const active = await query<{ apiId: number; fixtureId: number }>(
      `SELECT DISTINCT f.api_football_id AS "apiId", f.id AS "fixtureId"
       FROM group_fixtures gf JOIN fixtures f ON f.id = gf.fixture_id
       WHERE f.kickoff_at <= now()
         AND f.kickoff_at > now() - interval '5 hours'
         AND (
           f.status NOT IN ('FT','AET','PEN','PST','CANC','ABD','AWD','WO')
           OR (f.status IN ('FT','AET','PEN') AND f.elapsed IS NOT NULL AND f.elapsed < 85)
         )`,
    )
    if (active.rows.length === 0) return 0

    let updated = 0
    const live: Array<{ apiId: number; fixtureId: number }> = []
    // Batched twenty at a time on a paid plan, one at a time on the free plan
    // (which refuses the `ids` parameter) — see refetchFixtures.
    const batchSize = (await isRestrictedPlan()) ? 1 : 20
    const apiIds = active.rows.map((r) => r.apiId)
    for (let i = 0; i < apiIds.length; i += batchSize) {
      const batch = apiIds.slice(i, i + batchSize)
      const raws =
        batch.length === 1
          ? await apiFootballGet<RawFixture[]>('fixtures', { id: batch[0] })
          : await apiFootballGet<RawFixture[]>('fixtures', { ids: batch.join('-') })
      for (const raw of raws) {
        const row = await updateFixtureFromRaw(raw)
        if (row) {
          updated += 1
          if (LIVE_STATUSES.includes(raw.fixture.status.short)) {
            live.push({ apiId: raw.fixture.id, fixtureId: row.id })
          }
        }
      }
    }

    // If a match we just re-adopted was live again (it had wrongly been marked FT
    // and possibly settled on a partial score), wipe that premature settlement so it
    // re-scores for real at full-time. No-op when nothing was mis-settled.
    if (live.length > 0) {
      await query(
        `UPDATE predictions SET points_awarded = NULL, settled_at = NULL
         WHERE settled_at IS NOT NULL AND fixture_id = ANY($1)`,
        [live.map((t) => t.fixtureId)],
      )
    }

    // Goals detail (who scored) only for the still-live group matches. Fetch each
    // match's events first, THEN take a short-lived connection for just that write —
    // never hold one pooled client across the slow API round-trips (a Neon idle drop
    // mid-loop would otherwise kill the whole tick). Matches syncPlayersFor's pattern.
    for (const t of live) {
      const events = await apiFootballGet<RawFixtureEvent[]>('fixtures/events', {
        fixture: t.apiId,
      })
      await withDbRetry(async () => {
        const client = await getPool()!.connect()
        // Guard against a Neon socket drop mid-write emitting an unhandled 'error'.
        const onError = (err: unknown) => logger.error({ err, fixtureId: t.fixtureId }, 'live-events client error')
        client.on('error', onError)
        try {
          await replaceFixtureGoals(client, t.fixtureId, events)
        } finally {
          client.off('error', onError)
          client.release()
        }
      })
    }
    return updated
  })
}

// Safety net for the "stuck live" bug. The hourly results sync only sees today and
// yesterday, and there is no live sync any more, so a suspended or abandoned match
// can freeze in a live status and keep showing as "live" forever. This sweep
// re-reads the stuck ones and writes their real status, then coerces anything the
// API itself has left hanging. It costs nothing when nothing is stuck.
const STALE_LIVE_MAX_FIXTURES = 5

export async function syncStaleLiveFixtures(): Promise<SyncResult> {
  return runSyncJob('stale-live', async () => {
    const { rows } = await query<{ apiId: number }>(
      `SELECT api_football_id AS "apiId" FROM fixtures
       WHERE status = ANY($1) AND kickoff_at < now() - interval '5 hours'
       ORDER BY kickoff_at`,
      [LIVE_STATUSES],
    )
    // One request per fixture now (see refetchFixtures), so this is capped. Being
    // stuck in a live status is rare; if more than a handful are, the coercion
    // below catches them anyway without spending anything.
    // Capped only on the restricted plan, where each fixture is its own request.
    const stale = (await isRestrictedPlan()) ? rows.slice(0, STALE_LIVE_MAX_FIXTURES) : rows
    const updated = await refetchFixtures(stale.map((r) => r.apiId))
    // Last resort: if a fixture is still frozen on a live status a full day after
    // kickoff, mark it abandoned so a match can never be broadcast as live forever.
    // A day, not eight hours: this sweep now re-reads only STALE_LIVE_MAX_FIXTURES
    // a run, so a fixture deserves several chances to be checked before it is
    // written off on nothing but a timer.
    const coerced = await query(
      `UPDATE fixtures SET status = 'ABD', updated_at = now()
       WHERE status = ANY($1) AND kickoff_at < now() - interval '24 hours'`,
      [LIVE_STATUSES],
    )
    return updated + (coerced.rowCount ?? 0)
  })
}

// Detailed summary (events + statistics) for one finished fixture. Two requests.
export async function syncFixtureDetail(fixtureId: number, apiFixtureId: number): Promise<number> {
  const client = await getPool()!.connect()
  // A checked-out client that loses its connection mid-operation (e.g. Neon
  // resetting the socket) emits 'error'; without a listener that crashes the
  // whole process. Log it instead — the in-flight query still rejects and is
  // handled by the caller. Remove the listener on release so a REUSED pooled
  // client doesn't accumulate one listener per call (the MaxListeners leak).
  const onError = (err: unknown) => logger.error({ err, fixtureId }, 'fixture-detail client error')
  client.on('error', onError)
  try {
    const events = await apiFootballGet<RawFixtureEvent[]>('fixtures/events', { fixture: apiFixtureId })
    const stats = await apiFootballGet<RawFixtureStatistic[]>('fixtures/statistics', {
      fixture: apiFixtureId,
    })
    const ne = await replaceFixtureEvents(client, fixtureId, events)
    const ns = await replaceFixtureStats(client, fixtureId, stats)
    await client.query('UPDATE fixtures SET detail_synced_at = now() WHERE id = $1', [fixtureId])
    return ne + ns
  } finally {
    client.off('error', onError)
    client.release()
  }
}

// Enrich recently-finished matches that have no detailed summary yet. Bounded per
// run so it stays cheap on the cron; catches up newest-first.
export async function syncRecentMatchDetails(limit = 30): Promise<SyncResult> {
  return runSyncJob('match-details', async () => {
    const { rows } = await query<{ id: number; api_football_id: number }>(
      // Keyed off the STATISTICS, not detail_synced_at alone: syncMatchEvents
      // stamps that column having fetched only the event feed, so a match enriched
      // by it would otherwise never get its possession/shot numbers.
      //
      // But the stamp still has to bound the retry. Nearly a thousand finished
      // matches have no statistics and never will — API-Football does not cover
      // them for the domestic cups — and without this window the newest thirty of
      // them were re-bought every hour, sixty requests for nothing, rewriting
      // their event feeds thirteen times a day.
      `SELECT f.id, f.api_football_id
       FROM fixtures f JOIN leagues lg ON lg.id = f.league_id
       WHERE lg.api_football_id = ANY($1)
         AND f.status IN ('FT','AET','PEN')
         AND NOT EXISTS (SELECT 1 FROM fixture_stats st WHERE st.fixture_id = f.id)
         AND (f.detail_synced_at IS NULL OR f.detail_synced_at < now() - interval '7 days')
       ORDER BY f.detail_synced_at NULLS FIRST, f.kickoff_at DESC
       LIMIT $2`,
      [MATCH_DETAIL_LEAGUE_API_IDS, limit],
    )
    let total = 0
    for (const r of rows) {
      total += await syncFixtureDetail(r.id, r.api_football_id)
    }
    return total
  })
}

// How many fixtures one events run may fetch, and the floor it must leave in the
// day's budget for the load-bearing jobs (hourly results, the schedule sweep).
// Running hourly, these two numbers cap goal-detail spending at roughly half the
// daily allowance while guaranteeing the scores themselves always get through.
const EVENTS_PER_RUN = 4
const EVENTS_BUDGET_FLOOR = 30

/**
 * "Who scored", one request per match.
 *
 * This is the only job whose cost scales with how much football is played, so it
 * is bounded three ways: `EVENTS_PER_RUN` per run, a hard floor of
 * `EVENTS_BUDGET_FLOOR` requests left untouched for the scores, and a league
 * filter. Matches people actually predicted come first; after them, the
 * competitions this group follows (GOAL_DETAIL_LEAGUE_API_IDS), newest first.
 *
 * Fetches events only, never statistics — that was the second request per match
 * in the old syncFixtureDetail, and possession charts are not what anyone reads
 * here. Both the event feed and the goal list are written, so the match page and
 * the derived scorer leaderboards are fed by the same single request.
 */
export async function syncMatchEvents(limit = EVENTS_PER_RUN): Promise<SyncResult> {
  return runSyncJob(
    'match-events',
    async () => {
      const budget = await getBudget()
      const take = Math.min(limit, Math.max(0, budget.remaining - EVENTS_BUDGET_FLOOR))
      if (take === 0) return 0

      const { rows } = await query<{ id: number; api_football_id: number }>(
        `SELECT f.id, f.api_football_id,
                EXISTS (SELECT 1 FROM group_fixtures gf WHERE gf.fixture_id = f.id) AS is_group
         FROM fixtures f JOIN leagues l ON l.id = f.league_id
         WHERE f.status IN ('FT','AET','PEN')
           AND NOT EXISTS (SELECT 1 FROM fixture_events e WHERE e.fixture_id = f.id)
           -- detail_synced_at stops a match that genuinely HAS no events (an
           -- abandoned or unreported game) from being re-fetched every hour. It is
           -- a WINDOW, not a verdict: this is the only job that writes
           -- fixture_events on the restricted plan, and the goal lists the derived
           -- leaderboards are built from come from it, so no single stamp may
           -- remove a match from this queue for good.
           AND (f.detail_synced_at IS NULL OR f.detail_synced_at < now() - interval '7 days')
           AND (
             EXISTS (SELECT 1 FROM group_fixtures gf WHERE gf.fixture_id = f.id)
             OR (l.is_active AND l.api_football_id = ANY($1))
           )
         ORDER BY is_group DESC, f.kickoff_at DESC
         LIMIT $2`,
        [GOAL_DETAIL_LEAGUE_API_IDS, take],
      )

      let total = 0
      for (const r of rows) {
        const events = await apiFootballGet<RawFixtureEvent[]>('fixtures/events', {
          fixture: r.api_football_id,
        })
        // Fetch first, then take a short-lived connection for the write — never
        // hold a pooled client across the API round-trip (a Neon idle drop would
        // otherwise kill the run mid-loop).
        total += await withDbRetry(async () => {
          const client = await getPool()!.connect()
          const onError = (err: unknown) =>
            logger.error({ err, fixtureId: r.id }, 'match-events client error')
          client.on('error', onError)
          try {
            await client.query('BEGIN')
            const n = await replaceFixtureEvents(client, r.id, events)
            await replaceFixtureGoals(client, r.id, events)
            await client.query('UPDATE fixtures SET detail_synced_at = now() WHERE id = $1', [r.id])
            await client.query('COMMIT')
            return n
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {})
            throw err
          } finally {
            client.off('error', onError)
            client.release()
          }
        })
      }
      return total
    },
    { minBudget: EVENTS_BUDGET_FLOOR + 1 },
  )
}

// Full player roster + stats for one league-season, walking every page of the
// paginated players endpoint. Kept out of the recurring cron (it is request-heavy)
// and driven by the backfill / an admin trigger instead.
export async function syncPlayersFor(
  leagueId: number,
  leagueApiId: number,
  season: number,
): Promise<number> {
  let n = 0
  let page = 1
  let total = 1
  do {
    const body = await apiFootballGetEnvelope<RawPlayer[]>('players', {
      league: leagueApiId,
      season,
      page,
    })
    total = body.paging?.total ?? 1
    // Fresh short-lived connection per page (retried), so a Neon drop between
    // the slow API calls can't terminate a long backfill mid-way.
    n += await withDbRetry(async () => {
      const client = await getPool()!.connect()
      const onError = (err: unknown) =>
        logger.error({ err, leagueId, season }, 'players client error')
      client.on('error', onError)
      try {
        let cnt = 0
        for (const raw of body.response) {
          cnt += await upsertPlayer(client, leagueId, leagueApiId, season, raw)
        }
        return cnt
      } finally {
        client.off('error', onError)
        client.release()
      }
    })
    page += 1
  } while (page <= total)
  return n
}

// Full career: fetch one player's transfer history from API-Football (1 request) and
// cache it. Called lazily the first time a player's detail page is opened. A short-
// lived connection with an 'error' listener survives a Neon socket drop.
export async function syncPlayerTransfers(playerApiId: number): Promise<number> {
  // Lazily triggered from a user-facing player page, so it is the one API call
  // nobody schedules — which is exactly why it must still be counted. Without a
  // sync_logs row its requests vanish from the daily total the moment the process
  // restarts, and the budget guard would hand out an allowance already spent.
  const fetchOne = () =>
    apiFootballGet<Array<{ transfers?: RawTransfer[] }>>('transfers', { player: playerApiId })

  let raw: Array<{ transfers?: RawTransfer[] }>
  if (hasActiveTally()) {
    // Inside a job (the backfill calls this in a loop): that job's tally already
    // covers the request, and a second sync_logs row would count it twice in the
    // daily total the budget guard is hydrated from.
    raw = await fetchOne()
  } else {
    // A fresh tally per call, not a shared one: two player pages opened at once
    // would otherwise interleave into the same counter.
    const tally = { count: 0 }
    raw = await runWithTally(tally, fetchOne)
    if (tally.count > 0) await logSync('transfers', 0, tally.count, true, null)
  }
  const transfers = raw?.[0]?.transfers ?? []
  const client = await getPool()!.connect()
  const onError = (err: unknown) => logger.error({ err, playerApiId }, 'transfers client error')
  client.on('error', onError)
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM player_transfers WHERE player_api_id = $1`, [playerApiId])
    for (const t of transfers) {
      await client.query(
        `INSERT INTO player_transfers
           (player_api_id, transfer_date, type, in_team_api_id, in_team_name, out_team_api_id, out_team_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          playerApiId,
          t.date || null,
          t.type || null,
          t.teams?.in?.id ?? null,
          t.teams?.in?.name ?? null,
          t.teams?.out?.id ?? null,
          t.teams?.out?.name ?? null,
        ],
      )
    }
    await client.query(
      `INSERT INTO player_transfer_sync (player_api_id, synced_at, transfer_count)
       VALUES ($1, now(), $2)
       ON CONFLICT (player_api_id) DO UPDATE SET synced_at = now(), transfer_count = EXCLUDED.transfer_count`,
      [playerApiId, transfers.length],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.off('error', onError)
    client.release()
  }
  return transfers.length
}

// The season key for the current (2026-27) campaign.
export const CURRENT_SQUAD_SEASON = 2026

const sleepMs = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Retry a DB call on transient connection drops. Neon closes idle connections,
// so after a slow API call the pooled connection can be dead for the next query
// ("Connection terminated unexpectedly"); a retry gets a fresh one.
async function withDbRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < tries) await sleepMs(300 * attempt)
    }
  }
  throw lastErr
}

/**
 * Seed CURRENT-season (2026-27) player rows from each team's live squad. The
 * players/squads endpoint returns the roster that is registered right now — so
 * it reflects where a player actually plays this season, even in preseason when
 * the per-season stats endpoint is still empty. Each member is upserted as a
 * (player_api_id, league_id, CURRENT_SQUAD_SEASON) row carrying the current
 * team, shirt number, position, age and photo. Nationality is left for
 * backfillCurrentSquadNationality to copy from the player's historical rows.
 *
 * Uses pooled queries (never one held connection across slow API calls) and is
 * resilient: a failed team is logged and skipped. Returns rows upserted.
 */
export async function syncCurrentSquads(
  entries: { teamApiId: number; leagueId: number }[],
): Promise<number> {
  let upserted = 0
  for (const { teamApiId, leagueId } of entries) {
    let squads: RawSquad[] = []
    try {
      squads = await apiFootballGet<RawSquad[]>('players/squads', { team: teamApiId })
    } catch (err) {
      // A plan refusal or an exhausted budget will hit every remaining team the
      // same way, so stop rather than grind through hundreds of doomed requests.
      if (err instanceof ApiPlanError || err instanceof BudgetExhaustedError) throw err
      logger.warn({ teamApiId, err }, 'squad fetch failed; skipping team')
      continue
    }
    const squad = squads[0]
    if (!squad) continue
    const teamName = squad.team?.name ?? null
    try {
      for (const m of squad.players) {
        const res = await withDbRetry(() =>
          query(
            `INSERT INTO players
               (player_api_id, league_id, season, team_api_id, team_name, name, age,
                position, photo_url, jersey_number, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
             ON CONFLICT (player_api_id, league_id, season) DO UPDATE SET
               team_api_id = EXCLUDED.team_api_id,
               team_name = EXCLUDED.team_name,
               name = EXCLUDED.name,
               age = COALESCE(EXCLUDED.age, players.age),
               position = COALESCE(EXCLUDED.position, players.position),
               photo_url = COALESCE(EXCLUDED.photo_url, players.photo_url),
               jersey_number = EXCLUDED.jersey_number,
               updated_at = now()`,
            [
              m.id,
              leagueId,
              CURRENT_SQUAD_SEASON,
              teamApiId,
              teamName,
              m.name,
              m.age ?? null,
              m.position ?? null,
              m.photo ?? null,
              m.number ?? null,
            ],
          ),
        )
        upserted += res.rowCount ?? 0
      }
    } catch (err) {
      logger.warn({ teamApiId, err }, 'squad upsert failed after retries; skipping team')
    }
  }
  return upserted
}

/**
 * The squads endpoint carries only a name, so copy nationality + firstname +
 * lastname onto each current-season row from that player's most recent
 * historical row that has them. Fills nationality (for the flag) and the name
 * parts (so first-name search works). Returns rows updated.
 */
export async function backfillCurrentSquadProfiles(): Promise<number> {
  const res = await withDbRetry(() =>
    query(
      `UPDATE players tgt SET
         nationality = COALESCE(tgt.nationality, src.nationality),
         firstname = COALESCE(tgt.firstname, src.firstname),
         lastname = COALESCE(tgt.lastname, src.lastname),
         updated_at = now()
       FROM (
         -- Source from the newest row that has a REAL name (not just a nationality):
         -- a squad row can carry nationality yet lack firstname/lastname, and if that
         -- row is the newest it would become its own useless source, leaving the name
         -- abbreviated ("V. Muriqi"). Requiring firstname+lastname guarantees a
         -- complete profile to copy from.
         SELECT DISTINCT ON (player_api_id) player_api_id, nationality, firstname, lastname
         FROM players
         WHERE firstname IS NOT NULL AND firstname <> '' AND lastname IS NOT NULL AND lastname <> ''
         ORDER BY player_api_id, season DESC
       ) src
       WHERE tgt.player_api_id = src.player_api_id
         AND tgt.season = $1
         AND (tgt.nationality IS NULL OR tgt.firstname IS NULL OR tgt.lastname IS NULL)`,
      [CURRENT_SQUAD_SEASON],
    ),
  )
  return res.rowCount ?? 0
}

/**
 * Expand abbreviated display names ("L. Messi" → "Lionel Messi") using the
 * player's firstname. Only touches rows shaped like "X. Surname" that have a
 * firstname to expand from; everyone else (already-full names, or no firstname)
 * is left untouched. Returns rows updated.
 */
export async function expandAbbreviatedNames(): Promise<number> {
  const res = await withDbRetry(() =>
    query(
      `UPDATE players
       SET name = split_part(firstname, ' ', 1) || ' ' || substring(name from '^[A-ZÇĞİÖŞÜ]\\. (.*)$'),
           updated_at = now()
       WHERE name ~ '^[A-ZÇĞİÖŞÜ]\\. '
         AND firstname IS NOT NULL AND firstname <> ''
         AND substring(name from '^[A-ZÇĞİÖŞÜ]\\. (.*)$') IS NOT NULL`,
    ),
  )
  return res.rowCount ?? 0
}

// API-Football's `name` drops middle given names ("Fehmi Mert Günok" → "Fehmi
// Günok"). When the stored name is exactly <first given name> + <surname> and the
// firstname holds more given names, restore the full name. Deliberately narrow so
// mononyms/nicknames (Pedri, Vinícius Júnior) are never touched.
export async function restoreCompoundFirstNames(): Promise<number> {
  const res = await withDbRetry(() =>
    query(
      `UPDATE players
       SET name = trim(firstname || ' ' || lastname),
           updated_at = now()
       WHERE firstname IS NOT NULL AND firstname <> ''
         AND lastname IS NOT NULL AND lastname <> ''
         AND position(' ' in trim(firstname)) > 0
         AND name = split_part(firstname, ' ', 1) || ' ' || lastname
         AND name <> trim(firstname || ' ' || lastname)`,
    ),
  )
  return res.rowCount ?? 0
}

/**
 * Fill nationality + name parts on current-season rows from the players/profiles
 * endpoint — for players who have no historical row to copy from (new signings,
 * youth). One request per player; resilient and retry-wrapped. Returns rows
 * updated.
 */
export async function syncPlayerProfiles(playerApiIds: number[]): Promise<number> {
  interface RawProfile {
    firstname: string | null
    lastname: string | null
    nationality: string | null
    height: string | null
    weight: string | null
    photo: string | null
    birth: { date: string | null; place: string | null; country: string | null } | null
  }

  let updated = 0
  for (const id of playerApiIds) {
    let player: RawProfile | undefined
    try {
      const resp = await apiFootballGet<Array<{ player: RawProfile }>>('players/profiles', {
        player: id,
      })
      player = resp[0]?.player
    } catch (err) {
      if (err instanceof ApiPlanError || err instanceof BudgetExhaustedError) throw err
      logger.warn({ id, err }, 'profile fetch failed; skipping player')
      continue
    }
    if (!player) continue
    // The response carries ten fields and this used to keep three. Height and the
    // birth date are exactly what the squad card and the player header render as
    // "—", and they cost nothing extra — the request was already made.
    const res = await withDbRetry(() =>
      query(
        `UPDATE players SET
           nationality = COALESCE(nationality, $2),
           firstname = COALESCE(firstname, $3),
           lastname = COALESCE(lastname, $4),
           height = COALESCE(height, $5),
           weight = COALESCE(weight, $6),
           photo_url = COALESCE(photo_url, $7),
           birth_date = COALESCE(birth_date, $8),
           birth_place = COALESCE(birth_place, $9),
           updated_at = now()
         WHERE player_api_id = $1 AND season = $10`,
        [
          id,
          player.nationality ?? null,
          player.firstname ?? null,
          player.lastname ?? null,
          player.height ?? null,
          player.weight ?? null,
          player.photo ?? null,
          player.birth?.date ?? null,
          [player.birth?.place, player.birth?.country].filter(Boolean).join(', ') || null,
          CURRENT_SQUAD_SEASON,
        ],
      ),
    )
    updated += res.rowCount ?? 0
  }
  return updated
}


// One squad refresh = one API request per team, so refreshing every tracked team
// daily would cost hundreds of requests/day. Instead we rotate: each run refreshes
// the N most-stale teams (least-recently-updated first). Because syncCurrentSquads
// stamps updated_at, refreshed teams sink to the back and the rest surface next
// day, so every team is refreshed on a rolling cycle within a bounded budget.
// Kept small so it fits the free 100-req/day plan alongside the other daily syncs;
// raise it if the API plan is upgraded.
const SQUAD_REFRESH_MAX_TEAMS = 20

/**
 * Daily refresh of tracked teams' current squads so transfers (new club, shirt
 * number) show up. Processes a bounded, staleness-ordered slice each run (see
 * SQUAD_REFRESH_MAX_TEAMS), then re-derives nationality/name parts.
 */
export async function refreshCurrentSquads(): Promise<SyncResult> {
  return runSyncJob('squads', async () => {
    const { rows } = await query<{ teamApiId: number; leagueId: number }>(
      `SELECT p.team_api_id AS "teamApiId", p.league_id AS "leagueId"
       FROM players p JOIN leagues l ON l.id = p.league_id
       WHERE p.season = $1 AND p.team_api_id IS NOT NULL
         AND l.api_football_id = ANY($2)
       GROUP BY p.team_api_id, p.league_id
       ORDER BY MAX(p.updated_at) ASC NULLS FIRST
       LIMIT $3`,
      [CURRENT_SQUAD_SEASON, CONFIGURED_LEAGUE_API_IDS, SQUAD_REFRESH_MAX_TEAMS],
    )
    const n = await syncCurrentSquads(rows)
    await backfillCurrentSquadProfiles()
    await expandAbbreviatedNames()
    await restoreCompoundFirstNames()
    return n
  })
}

/**
 * Retire tournaments (e.g. the World Cup) once every match has been played, so
 * they drop off the home page automatically. Club leagues never auto-retire.
 */
export async function deactivateEndedTournaments(): Promise<number> {
  const res = await query(
    `UPDATE leagues SET is_active = false, updated_at = now()
     WHERE is_active = true
       AND api_football_id = ANY($1)
       AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_id = leagues.id)
       AND NOT EXISTS (
         SELECT 1 FROM fixtures f
         WHERE f.league_id = leagues.id
           AND ((f.status = 'NS' AND f.kickoff_at > now())
                OR f.status IN ('1H','HT','2H','ET','BT','P','LIVE','SUSP','INT'))
       )`,
    [TOURNAMENT_API_IDS],
  )
  return res.rowCount ?? 0
}

/**
 * One-time historical load: seed the leagues, then sync fixtures, standings and
 * scorers for ALL seasons (including inactive past ones). Heavier than the daily
 * jobs, so it is triggered manually. Ongoing sync stays on active leagues.
 */
export async function backfillAllSeasons(): Promise<SyncResult[]> {
  return [
    await seedLeaguesJob(),
    await syncFixtures(true),
    await syncStandings(true),
    await syncTopScorers(true),
    await syncTopAssists(true),
  ]
}
