import {
  ApiPlanError,
  apiFootballGet,
  BudgetExhaustedError,
  getBudget,
  getRequestCount,
} from '../../../lib/api-football/client'
import { isRestrictedPlan } from '../../../lib/api-football/plan'
import { getPool, query } from '../../../db/pool'
import { logger } from '../../../lib/logger'
import type { RawTeamInfo, RawTopScorer, RawStandingsLeague } from '../types'
import { CONFIGURED_LEAGUE_API_IDS, DOMESTIC_CUP_API_IDS } from '../leagues.config'
import { replaceTopAssists, replaceTopScorers, upsertStanding, upsertTeam } from './upserts'
import {
  backfillCurrentSquadProfiles,
  runSyncJob,
  syncFixtureDetail,
  syncPlayerProfiles,
  syncPlayersFor,
  syncPlayerTransfers,
  type SyncResult,
} from './jobs'

/**
 * Fill in everything the app never got round to fetching, a little at a time.
 *
 * The point is that fetched data is PERMANENT. It lands in Postgres and the site
 * serves it from there forever, cache-first — so a request spent here still pays
 * off long after the subscription lapses, which is not true of anything live.
 * When the plan drops back to Free this whole job switches itself off; whatever
 * it managed to collect stays.
 *
 * It walks a priority ladder, cheapest and most visible first, and stops the
 * moment either budget runs out. Every step is keyed off what is MISSING, so a
 * run that is cut short simply resumes where it left off next time.
 */

/**
 * How much of this run is left.
 *
 * Requests are measured from the client's own counter rather than tallied by
 * hand, so a step that pages internally (player rosters) is charged what it
 * actually cost instead of a guess. The counter is process-wide, so a sync
 * running alongside this one is counted here too — which makes the backfill stop
 * early rather than late, the right direction when something else needs the
 * allowance more.
 */
interface BackfillBudget {
  start: number
  max: number
  until: number
}

/**
 * An error that says nothing about the item and everything about the account.
 *
 * These two are thrown BEFORE the request is counted, so they cost nothing — which
 * makes them uniquely dangerous here. Treated as a per-item failure they let one
 * plan lapse spin through an entire queue at database speed, marking every item as
 * tried without a single request being spent. Every loop must abandon the step
 * instead, exactly as perLeague does in jobs.ts.
 */
function isAccountError(err: unknown): boolean {
  return err instanceof ApiPlanError || err instanceof BudgetExhaustedError
}

const used = (b: BackfillBudget): number => getRequestCount() - b.start
const left = (b: BackfillBudget): number => b.max - used(b)
const alive = (b: BackfillBudget): boolean => left(b) > 0 && Date.now() < b.until

/**
 * Carve a share of what is left — of BOTH requests and the clock — for one step.
 *
 * Strict priority does not work here: the match-detail queue is four thousand items
 * long and would take every run for a week, leaving the player pages (just as
 * visibly empty) waiting behind it. Taking a fraction of what REMAINS at each rung
 * is self-balancing: a cheap step that finishes early hands its unused share down,
 * and the last step still gets whatever is left.
 *
 * The clock matters as much as the count. Every pass so far has ended on the
 * deadline, not on the budget — the work is database-bound, not API-bound.
 */
function share(b: BackfillBudget, fraction: number): BackfillBudget {
  const now = Date.now()
  return {
    start: getRequestCount(),
    max: Math.max(0, Math.ceil(left(b) * fraction)),
    until: now + Math.max(0, Math.ceil((b.until - now) * fraction)),
  }
}

/**
 * What this step has already asked for and come back empty-handed from.
 *
 * Every step is driven by what is MISSING, which works only while "missing" means
 * "not fetched yet". Some of it is missing because the API has nothing either, and
 * that gap never closes — so it sits at the head of the queue and is re-bought on
 * every run. The three UEFA competitions cost nine requests a run this way while
 * their qualifying rounds were still being played.
 *
 * A cooldown rather than a permanent skip, and stored rather than remembered in
 * memory: these gaps do close eventually (a league phase starts, a squad is
 * registered), and a process restart should not mean paying for the lesson again.
 */
async function skipRecentlyTried(scope: string, days: number): Promise<Set<number>> {
  const { rows } = await query<{ ref_id: string }>(
    `SELECT ref_id FROM backfill_attempts
     WHERE scope = $1 AND attempted_at > now() - make_interval(days => $2::int)`,
    [scope, days],
  )
  return new Set(rows.map((r) => Number(r.ref_id)))
}

async function markTried(scope: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await query(
    `INSERT INTO backfill_attempts (scope, ref_id)
     SELECT $1, unnest($2::bigint[])
     ON CONFLICT (scope, ref_id) DO UPDATE SET attempted_at = now()`,
    [scope, ids],
  )
}

/**
 * Venue and city for the teams we hold. One request per league-season returns
 * every team in it, so this is the cheapest gap to close.
 */
async function backfillTeamVenues(b: BackfillBudget): Promise<number> {
  const { rows } = await query<{ id: number; api_football_id: number; season: number }>(
    `SELECT DISTINCT l.id, l.api_football_id, l.season
     FROM leagues l
     WHERE l.api_football_id = ANY($1)
       AND EXISTS (
         SELECT 1 FROM fixtures f
         JOIN teams t ON t.id IN (f.home_team_id, f.away_team_id)
         WHERE f.league_id = l.id AND t.stadium_name IS NULL
       )
     ORDER BY l.season DESC, l.api_football_id`,
    [CONFIGURED_LEAGUE_API_IDS],
  )
  const skip = await skipRecentlyTried('venues', 30)
  let filled = 0
  for (const l of rows) {
    if (skip.has(l.id)) continue
    if (!alive(b)) break
    // Marked AFTER the request, never before: an account error costs nothing, so
    // marking first would write a 30-day cooldown over the whole queue in the
    // moment a plan lapses, for no requests at all.
    let teams: RawTeamInfo[]
    try {
      teams = await apiFootballGet<RawTeamInfo[]>('teams', {
        league: l.api_football_id,
        season: l.season,
      })
    } catch (err) {
      if (isAccountError(err)) return filled
      logger.warn({ err, league: l.api_football_id, season: l.season }, 'Venue fetch failed')
      await markTried('venues', [l.id])
      continue
    }
    await markTried('venues', [l.id])
    const client = await getPool()!.connect()
    try {
      for (const t of teams) {
        if (!t.team?.id || !t.team.name) continue
        await upsertTeam(client, t.team.id, t.team.name, {
          stadium: t.venue?.name ?? null,
          city: t.venue?.city ?? null,
        })
        // Count what we actually learned, not every row we touched: a league is
        // re-read for the sake of a handful of teams, and reporting the whole
        // squad list as "filled" makes the log read like progress that isn't.
        if (t.venue?.name) filled += 1
      }
    } finally {
      client.release()
    }
  }
  return filled
}

/**
 * Standings and scorer lists for past seasons that have none. Three requests per
 * league-season, and it makes the season switcher useful instead of empty.
 */
async function backfillPastSeasons(b: BackfillBudget): Promise<number> {
  const { rows } = await query<{ id: number; api_football_id: number; season: number }>(
    `SELECT l.id, l.api_football_id, l.season
     FROM leagues l
     WHERE l.api_football_id = ANY($1)
       -- Knockout cups have a bracket, never a table. Without this they would
       -- come back empty-handed on every single run, three requests at a time.
       AND NOT (l.api_football_id = ANY($2))
       AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_id = l.id)
       AND NOT EXISTS (SELECT 1 FROM standings s WHERE s.league_id = l.id)
     ORDER BY l.season DESC, l.api_football_id`,
    [CONFIGURED_LEAGUE_API_IDS, DOMESTIC_CUP_API_IDS],
  )
  // Three days: a competition still in its qualifying rounds has no table yet,
  // but will once the league phase starts.
  const skip = await skipRecentlyTried('past-seasons', 3)
  let done = 0
  for (const l of rows) {
    if (skip.has(l.id)) continue
    if (!alive(b) || left(b) < 3) break

    // Fetch all three FIRST, holding no database connection. The previous version
    // kept a pooled client inside an open transaction across these calls — up to
    // four minutes with the 429 backoffs — and pg-pool removes its own 'error'
    // handler while a client is checked out, so a Neon socket reset would have
    // raised an uncaughtException and taken the whole backend down with it.
    let data, scorers, assists
    try {
      data = await apiFootballGet<RawStandingsLeague[]>('standings', {
        league: l.api_football_id,
        season: l.season,
      })
      scorers = await apiFootballGet<RawTopScorer[]>('players/topscorers', {
        league: l.api_football_id,
        season: l.season,
      })
      assists = await apiFootballGet<RawTopScorer[]>('players/topassists', {
        league: l.api_football_id,
        season: l.season,
      })
    } catch (err) {
      if (isAccountError(err)) return done
      logger.warn({ err, league: l.api_football_id, season: l.season }, 'Past-season fetch failed')
      await markTried('past-seasons', [l.id])
      continue
    }
    await markTried('past-seasons', [l.id])

    const client = await getPool()!.connect()
    const onError = (err: unknown) =>
      logger.error({ err, leagueId: l.id }, 'past-seasons client error')
    client.on('error', onError)
    try {
      await client.query('BEGIN')
      for (const group of data[0]?.league.standings ?? []) {
        for (const row of group) await upsertStanding(client, l.id, row)
      }
      await replaceTopScorers(client, l.id, scorers)
      await replaceTopAssists(client, l.id, assists)
      await client.query('COMMIT')
      done += 1
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      logger.warn({ err, league: l.api_football_id, season: l.season }, 'Past-season write failed')
    } finally {
      client.off('error', onError)
      client.release()
    }
  }
  return done
}

/**
 * Event feeds and team statistics for finished matches that have neither. Two
 * requests per match and by far the largest gap, so it is deliberately last of
 * the cheap steps and newest-first — the matches people are most likely to open.
 *
 * This one keeps paying after the plan drops: the derived scorer leaderboards the
 * free plan falls back on are built from these very events.
 */
async function backfillMatchDetails(b: BackfillBudget): Promise<number> {
  let done = 0
  let consecutiveFailures = 0
  const tried: number[] = []
  const flush = async () => {
    await markTried('match-detail', tried.splice(0))
  }

  while (alive(b) && left(b) >= 2) {
    const { rows } = await query<{ id: number; api_football_id: number }>(
      `SELECT f.id, f.api_football_id
       FROM fixtures f JOIN leagues l ON l.id = f.league_id
       WHERE l.api_football_id = ANY($1)
         AND f.status IN ('FT','AET','PEN')
         AND (
           NOT EXISTS (SELECT 1 FROM fixture_events e WHERE e.fixture_id = f.id)
           OR NOT EXISTS (SELECT 1 FROM fixture_stats st WHERE st.fixture_id = f.id)
         )
         -- The attempt log, not detail_synced_at. That column is read by
         -- syncMatchEvents as "this match has been enriched", and writing it from
         -- here to mean "we tried and it did not work" removed matches from the
         -- restricted plan's only who-scored job for good.
         AND NOT EXISTS (
           SELECT 1 FROM backfill_attempts a
           WHERE a.scope = 'match-detail' AND a.ref_id = f.id
             AND a.attempted_at > now() - interval '7 days'
         )
       ORDER BY f.detail_synced_at NULLS FIRST, f.kickoff_at DESC
       -- A big batch on purpose: this query anti-joins two tables of hundreds of
       -- thousands of rows, so it is far more expensive than the work it hands
       -- out. Refilling every 200 matches instead of every 25 keeps the loop
       -- spending its time on the API rather than on planning.
       LIMIT 200`,
      [CONFIGURED_LEAGUE_API_IDS],
    )
    if (rows.length === 0) break

    for (const r of rows) {
      if (!alive(b) || left(b) < 2) break
      try {
        await syncFixtureDetail(r.id, r.api_football_id)
        consecutiveFailures = 0
        done += 1
      } catch (err) {
        // Nothing about THIS fixture went wrong — the account did. Leave it in the
        // queue and abandon the step; marking it would cost nothing and delete
        // thousands of rows from the queue in the seconds after a plan lapse.
        if (isAccountError(err)) {
          await flush()
          logger.warn({ err }, 'Match-detail backfill stopping: the account, not the fixture')
          return done
        }
        logger.warn({ err, fixtureId: r.id }, 'Match-detail backfill failed; skipping')
        // A run of failures that are not account errors still means something is
        // wrong upstream. Stop rather than walk the whole queue burning requests.
        if ((consecutiveFailures += 1) >= 5) {
          await flush()
          logger.warn({ consecutiveFailures }, 'Match-detail backfill stopping after repeated failures')
          return done
        }
      }
      // Recorded whatever the outcome, so a match the API has nothing for waits a
      // week rather than sitting at the head of the queue.
      tried.push(r.id)
      if (tried.length >= 100) await flush()
    }
  }
  await flush()
  return done
}

/**
 * Full player rosters, from the paginated `players` endpoint — roughly one request
 * per twenty players, so a league-season costs ~30.
 *
 * Two gaps, not one. The obvious one is a league-season with no players at all.
 * The quieter one is a league-season seeded from `players/squads`, which carries
 * a name, shirt number and photo but no nationality, no birth date and no season
 * statistics — 8,433 of the current season's 10,425 players were in exactly that
 * state, looking populated while every player page showed blanks. So a roster is
 * also worth pulling when most of its players have no appearances recorded.
 */
async function backfillPlayers(b: BackfillBudget): Promise<number> {
  const { rows } = await query<{ id: number; api_football_id: number; season: number }>(
    `SELECT l.id, l.api_football_id, l.season
     FROM leagues l
     WHERE l.api_football_id = ANY($1)
       AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_id = l.id)
       AND (
         NOT EXISTS (SELECT 1 FROM players p WHERE p.league_id = l.id)
         OR (
           SELECT count(*) FILTER (WHERE p.appearances IS NULL) > count(*) / 2
           FROM players p WHERE p.league_id = l.id
         )
       )
     ORDER BY l.season DESC, l.api_football_id`,
    [CONFIGURED_LEAGUE_API_IDS],
  )
  const skip = await skipRecentlyTried('rosters', 7)
  let done = 0
  for (const l of rows) {
    if (skip.has(l.id)) continue
    // A league-season is all-or-nothing: stopping half way through the pages would
    // leave it looking populated while most of it is still blank.
    if (!alive(b) || left(b) < 40) break
    try {
      const n = await syncPlayersFor(l.id, l.api_football_id, l.season)
      if (n > 0) done += 1
      else logger.info({ league: l.api_football_id, season: l.season }, 'No roster available')
    } catch (err) {
      if (isAccountError(err)) return done
      logger.warn({ err, league: l.api_football_id, season: l.season }, 'Player backfill failed')
    }
    // One try per league-season per cooldown, whatever the outcome — but only for
    // an attempt that actually reached the API.
    await markTried('rosters', [l.id])
  }
  return done
}

/**
 * Nationality and full name for current-squad players who have neither — the flag
 * and the searchable name on a player page.
 *
 * The free pass runs first: most of these players already have a historical row
 * carrying the details, and copying across costs nothing. Only what is left over
 * (a new signing, a youth debut) is worth a request each.
 */
async function backfillPlayerProfiles(b: BackfillBudget, cap = 300): Promise<number> {
  await backfillCurrentSquadProfiles()
  const { rows } = await query<{ player_api_id: number }>(
    // Only genuine leftovers. `appearances IS NOT NULL` means the roster step has
    // already been through this league-season with the paginated players endpoint,
    // which fills nationality for ~500 players in ~30 requests. Asking
    // players/profiles one player at a time before that has happened is sixty times
    // the cost for the same field — the first run spent 104 requests to fill nine.
    `SELECT DISTINCT player_api_id FROM players
     WHERE season = (SELECT max(season) FROM players)
       AND nationality IS NULL
       AND appearances IS NOT NULL
     LIMIT $1`,
    [cap],
  )
  const skip = await skipRecentlyTried('profiles', 30)
  const todo = rows.map((r) => r.player_api_id).filter((id) => !skip.has(id))
  if (todo.length === 0) return 0
  const batch = todo.slice(0, Math.max(0, Math.min(todo.length, left(b))))
  let updated = 0
  try {
    updated = await syncPlayerProfiles(batch)
  } catch (err) {
    // Nothing marked: an account error would otherwise put three hundred players
    // behind a thirty-day cooldown without a single request being spent.
    if (isAccountError(err)) return 0
    logger.warn({ err }, 'Profile backfill failed')
  }
  await markTried('profiles', batch)
  return updated
}

/**
 * Career history for players in a current squad. One request each, so it is last
 * and hard-capped: the player page fetches this lazily anyway, and prefetching
 * only buys instant loads plus survival past the plan change.
 */
async function backfillTransfers(b: BackfillBudget, cap = 200): Promise<number> {
  const { rows } = await query<{ player_api_id: number }>(
    `SELECT DISTINCT p.player_api_id
     FROM players p
     WHERE p.season = (SELECT max(season) FROM players)
       AND NOT EXISTS (
         SELECT 1 FROM player_transfer_sync s WHERE s.player_api_id = p.player_api_id
       )
     LIMIT $1`,
    [cap],
  )
  let done = 0
  for (const r of rows) {
    if (!alive(b)) break
    try {
      await syncPlayerTransfers(r.player_api_id)
      done += 1
    } catch (err) {
      if (isAccountError(err)) return done
      logger.warn({ err, playerApiId: r.player_api_id }, 'Transfer backfill failed; skipping')
    }
  }
  return done
}

// Per run: enough to make real progress in a few minutes, small enough that an
// HTTP-triggered run returns before anything times out.
const BACKFILL_REQUESTS = 500
const BACKFILL_MS = 240_000

// And a floor for the day. The backfill is the only job that would happily spend
// the entire allowance, so it stops while this much is still left — the scores,
// which are what anyone actually notices, are never starved by it.
const BACKFILL_DAILY_FLOOR = 1000

/**
 * One pass up the ladder. Runs only while the plan is unrestricted — when Pro
 * expires this becomes a no-op and the data already collected simply stays.
 *
 * Wrapped in the standard job runner, so its requests are counted per-job and the
 * pass lands in `sync_logs` like everything else.
 */
export async function backfillJob(
  requests = BACKFILL_REQUESTS,
  ms = BACKFILL_MS,
): Promise<SyncResult> {
  return runSyncJob(
    'backfill',
    async () => {
      if (await isRestrictedPlan()) {
        logger.info({ job: 'backfill' }, 'Restricted plan — backfill is a paid-plan luxury, skipping')
        return 0
      }
      // runSyncJob's minBudget is a gate, checked once — it stops a run STARTING
      // below the floor but does nothing to stop one spending straight through it.
      // Cap the run at what is actually left above the floor so the promise the
      // comment makes is the one the code keeps.
      const daily = await getBudget()
      const room = Math.max(0, daily.remaining - BACKFILL_DAILY_FLOOR)
      if (room === 0) {
        logger.info({ job: 'backfill', ...daily }, 'At the daily floor — leaving the rest for the scores')
        return 0
      }
      const budget: BackfillBudget = {
        start: getRequestCount(),
        max: Math.min(requests, room),
        until: Date.now() + ms,
      }
      const done: Record<string, number> = {}

      // Shares of what remains, cheapest and most visible first. The two small
      // steps converge in a run or two and then cost nothing, handing their share
      // to the long queues below them.
      done.venues = await backfillTeamVenues(share(budget, 0.15))
      if (alive(budget)) done.pastSeasons = await backfillPastSeasons(share(budget, 0.15))
      // Rosters before match detail, despite the far shorter queue — precisely
      // because it is short and dense. ~30 requests fills a whole league-season of
      // 500 player pages; match detail buys one match per two requests, and its
      // four-thousand-item queue would otherwise make the players wait a week.
      if (alive(budget)) done.players = await backfillPlayers(share(budget, 0.4))
      if (alive(budget)) done.matchDetails = await backfillMatchDetails(share(budget, 0.6))
      if (alive(budget)) done.profiles = await backfillPlayerProfiles(share(budget, 0.5))
      if (alive(budget)) done.transfers = await backfillTransfers(budget)

      logger.info({ ...done, requestsUsed: used(budget) }, 'Backfill pass complete')
      return Object.values(done).reduce((a, n) => a + n, 0)
    },
    { minBudget: BACKFILL_DAILY_FLOOR },
  )
}
