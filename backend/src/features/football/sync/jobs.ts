import type { PoolClient } from 'pg'
import { getPool, query } from '../../../db/pool'
import { logger } from '../../../lib/logger'
import {
  apiFootballGet,
  apiFootballGetEnvelope,
  getRequestCount,
  resetRequestCount,
} from '../../../lib/api-football/client'
import type {
  RawFixture,
  RawFixtureEvent,
  RawFixtureStatistic,
  RawPlayer,
  RawStandingsLeague,
  RawTopScorer,
} from '../types'
import { CONFIGURED_LEAGUE_API_IDS, seedLeagues, TOURNAMENT_API_IDS } from '../leagues.config'
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
  error?: string
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
async function runJob(job: string, work: () => Promise<number>): Promise<SyncResult> {
  if (!getPool()) {
    logger.error({ job }, 'DATABASE_URL not configured; skipping sync')
    return { job, success: false, records: 0, requests: 0, error: 'no database' }
  }
  resetRequestCount()
  try {
    const records = await work()
    const requests = getRequestCount()
    await logSync(job, records, requests, true, null)
    logger.info({ job, records, requests }, 'Sync completed')
    return { job, success: true, records, requests }
  } catch (err) {
    const requests = getRequestCount()
    const message = err instanceof Error ? err.message : String(err)
    await logSync(job, 0, requests, false, message)
    logger.error({ err, job }, 'Sync failed')
    return { job, success: false, records: 0, requests, error: message }
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
    try {
      await client.query('BEGIN')
      total += await fn(client, league)
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      logger.error({ err, league: league.api_football_id }, 'League sync failed; rolled back')
    } finally {
      client.release()
    }
  }
  return total
}

/** Seed the configured leagues into the DB (no API requests). */
export async function seedLeaguesJob(): Promise<SyncResult> {
  return runJob('seed', async () => {
    const client = await getPool()!.connect()
    try {
      return await seedLeagues(client)
    } finally {
      client.release()
    }
  })
}

export async function syncFixtures(includeInactive = false): Promise<SyncResult> {
  return runJob('fixtures', async () => {
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

export async function syncResults(): Promise<SyncResult> {
  return runJob('results', async () => {
    const leagues = await getLeagues(false)
    const today = new Date().toISOString().slice(0, 10)
    return perLeague(leagues, async (client, league) => {
      const fixtures = await apiFootballGet<RawFixture[]>('fixtures', {
        league: league.api_football_id,
        season: league.season,
        date: today,
      })
      const teamIds = await upsertTeamsBatch(client, collectTeams(fixtures))
      return upsertFixturesBatch(client, league.id, fixtures, teamIds)
    })
  })
}

export async function syncStandings(includeInactive = false): Promise<SyncResult> {
  return runJob('standings', async () => {
    const leagues = await getLeagues(includeInactive)
    return perLeague(leagues, async (client, league) => {
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
    })
  })
}

export async function syncTopScorers(includeInactive = false): Promise<SyncResult> {
  return runJob('topscorers', async () => {
    const leagues = await getLeagues(includeInactive)
    return perLeague(leagues, async (client, league) => {
      const scorers = await apiFootballGet<RawTopScorer[]>('players/topscorers', {
        league: league.api_football_id,
        season: league.season,
      })
      return replaceTopScorers(client, league.id, scorers)
    })
  })
}

export async function syncTopAssists(includeInactive = false): Promise<SyncResult> {
  return runJob('topassists', async () => {
    const leagues = await getLeagues(includeInactive)
    return perLeague(leagues, async (client, league) => {
      const assisters = await apiFootballGet<RawTopScorer[]>('players/topassists', {
        league: league.api_football_id,
        season: league.season,
      })
      return replaceTopAssists(client, league.id, assisters)
    })
  })
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

export async function syncLiveScores(): Promise<SyncResult> {
  return runJob('live', async () => {
    // Run when something could be live now, OR when we still have a fixture marked
    // live (which may actually have ended and needs reconciling to FT).
    const maybe = await query(
      `SELECT 1 FROM fixtures
       WHERE (kickoff_at BETWEEN now() - interval '4 hours' AND now()
              AND status NOT IN ('FT','AET','PEN','PST','CANC','ABD','AWD','WO'))
          OR status = ANY($1)
       LIMIT 1`,
      [LIVE_STATUSES],
    )
    if ((maybe.rowCount ?? 0) === 0) return 0

    const live = await apiFootballGet<RawFixture[]>('fixtures', { live: 'all' })
    const liveIds = new Set(live.map((f) => f.fixture.id))
    let updated = 0
    const tracked: Array<{ apiId: number; fixtureId: number }> = []
    for (const raw of live) {
      const row = await updateFixtureFromRaw(raw)
      if (row) {
        updated += 1
        tracked.push({ apiId: raw.fixture.id, fixtureId: row.id })
      }
    }

    // Reconcile: fixtures we still mark live but that are NO LONGER in live=all
    // have ended — fetch their final status/score so they stop showing as live.
    const stale = await query<{ api_football_id: number }>(
      `SELECT api_football_id FROM fixtures WHERE status = ANY($1)`,
      [LIVE_STATUSES],
    )
    const staleIds = stale.rows.map((r) => r.api_football_id).filter((id) => !liveIds.has(id))
    for (let i = 0; i < staleIds.length; i += 20) {
      const batch = staleIds.slice(i, i + 20)
      const finals = await apiFootballGet<RawFixture[]>('fixtures', { ids: batch.join('-') })
      for (const raw of finals) {
        if (await updateFixtureFromRaw(raw)) updated += 1
      }
    }

    // For each live match we track, refresh who scored (one request each).
    if (tracked.length > 0) {
      const client = await getPool()!.connect()
      try {
        for (const t of tracked) {
          const events = await apiFootballGet<RawFixtureEvent[]>('fixtures/events', {
            fixture: t.apiId,
          })
          await replaceFixtureGoals(client, t.fixtureId, events)
        }
      } finally {
        client.release()
      }
    }
    return updated
  })
}

// Detailed summary (events + statistics) for one finished fixture. Two requests.
export async function syncFixtureDetail(fixtureId: number, apiFixtureId: number): Promise<number> {
  const client = await getPool()!.connect()
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
    client.release()
  }
}

// Enrich recently-finished matches that have no detailed summary yet. Bounded per
// run so it stays cheap on the cron; catches up newest-first.
export async function syncRecentMatchDetails(limit = 30): Promise<SyncResult> {
  return runJob('match-details', async () => {
    const { rows } = await query<{ id: number; api_football_id: number }>(
      `SELECT f.id, f.api_football_id
       FROM fixtures f JOIN leagues lg ON lg.id = f.league_id
       WHERE lg.api_football_id = ANY($1)
         AND f.status IN ('FT','AET','PEN')
         AND f.detail_synced_at IS NULL
       ORDER BY f.kickoff_at DESC
       LIMIT $2`,
      [CONFIGURED_LEAGUE_API_IDS, limit],
    )
    let total = 0
    for (const r of rows) {
      total += await syncFixtureDetail(r.id, r.api_football_id)
    }
    return total
  })
}

// Full player roster + stats for one league-season, walking every page of the
// paginated players endpoint. Kept out of the recurring cron (it is request-heavy)
// and driven by the backfill / an admin trigger instead.
export async function syncPlayersFor(
  leagueId: number,
  leagueApiId: number,
  season: number,
): Promise<number> {
  const client = await getPool()!.connect()
  let n = 0
  try {
    let page = 1
    let total = 1
    do {
      const body = await apiFootballGetEnvelope<RawPlayer[]>('players', {
        league: leagueApiId,
        season,
        page,
      })
      total = body.paging?.total ?? 1
      for (const raw of body.response) {
        n += await upsertPlayer(client, leagueId, leagueApiId, season, raw)
      }
      page += 1
    } while (page <= total)
  } finally {
    client.release()
  }
  return n
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
