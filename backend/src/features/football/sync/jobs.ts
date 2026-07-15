import type { PoolClient } from 'pg'
import { getPool, query } from '../../../db/pool'
import { logger } from '../../../lib/logger'
import { apiFootballGet, getRequestCount, resetRequestCount } from '../../../lib/api-football/client'
import type { RawFixture, RawStandingsLeague, RawTopScorer } from '../types'
import { seedLeagues } from '../leagues.config'
import {
  collectTeams,
  replaceTopAssists,
  replaceTopScorers,
  upsertFixturesBatch,
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
export async function syncLiveScores(): Promise<SyncResult> {
  return runJob('live', async () => {
    const maybe = await query(
      `SELECT 1 FROM fixtures
       WHERE kickoff_at BETWEEN now() - interval '3 hours' AND now()
         AND status NOT IN ('FT','AET','PEN','PST','CANC','ABD','AWD','WO')
       LIMIT 1`,
    )
    if ((maybe.rowCount ?? 0) === 0) return 0

    const fixtures = await apiFootballGet<RawFixture[]>('fixtures', { live: 'all' })
    let updated = 0
    for (const raw of fixtures) {
      const res = await query(
        `UPDATE fixtures SET status = $2, home_score = $3, away_score = $4,
           halftime_home = $5, halftime_away = $6, updated_at = now()
         WHERE api_football_id = $1`,
        [
          raw.fixture.id,
          raw.fixture.status.short,
          raw.goals.home,
          raw.goals.away,
          raw.score.halftime.home,
          raw.score.halftime.away,
        ],
      )
      updated += res.rowCount ?? 0
    }
    return updated
  })
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
