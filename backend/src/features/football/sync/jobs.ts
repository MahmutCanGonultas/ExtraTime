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
  RawSquad,
  RawStandingsLeague,
  RawTopScorer,
} from '../types'
import {
  CONFIGURED_LEAGUE_API_IDS,
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
  // A checked-out client that loses its connection mid-operation (e.g. Neon
  // resetting the socket) emits 'error'; without a listener that crashes the
  // whole process. Log it instead — the in-flight query still rejects and is
  // handled by the caller.
  client.on('error', (err) => logger.error({ err, fixtureId }, 'fixture-detail client error'))
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
      [MATCH_DETAIL_LEAGUE_API_IDS, limit],
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
      try {
        let cnt = 0
        for (const raw of body.response) {
          cnt += await upsertPlayer(client, leagueId, leagueApiId, season, raw)
        }
        return cnt
      } finally {
        client.release()
      }
    })
    page += 1
  } while (page <= total)
  return n
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
         SELECT DISTINCT ON (player_api_id) player_api_id, nationality, firstname, lastname
         FROM players
         WHERE nationality IS NOT NULL
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
  let updated = 0
  for (const id of playerApiIds) {
    let player: { firstname: string | null; lastname: string | null; nationality: string | null } | undefined
    try {
      const resp = await apiFootballGet<
        Array<{ player: { firstname: string | null; lastname: string | null; nationality: string | null } }>
      >('players/profiles', { player: id })
      player = resp[0]?.player
    } catch (err) {
      logger.warn({ id, err }, 'profile fetch failed; skipping player')
      continue
    }
    if (!player) continue
    const res = await withDbRetry(() =>
      query(
        `UPDATE players SET
           nationality = COALESCE(nationality, $2),
           firstname = COALESCE(firstname, $3),
           lastname = COALESCE(lastname, $4),
           updated_at = now()
         WHERE player_api_id = $1 AND season = $5`,
        [id, player.nationality ?? null, player.firstname ?? null, player.lastname ?? null, CURRENT_SQUAD_SEASON],
      ),
    )
    updated += res.rowCount ?? 0
  }
  return updated
}

/**
 * Daily refresh of every tracked team's current squad so transfers show up —
 * important during the transfer window. Re-pulls the live roster for all teams
 * we hold a current-season row for, then re-derives nationality/name parts.
 * Heavier than the other daily jobs (~one request per team), so it runs once a
 * day.
 */
export async function refreshCurrentSquads(): Promise<SyncResult> {
  return runJob('squads', async () => {
    const { rows } = await query<{ teamApiId: number; leagueId: number }>(
      `SELECT DISTINCT p.team_api_id AS "teamApiId", p.league_id AS "leagueId"
       FROM players p JOIN leagues l ON l.id = p.league_id
       WHERE p.season = $1 AND p.team_api_id IS NOT NULL
         AND l.api_football_id = ANY($2)`,
      [CURRENT_SQUAD_SEASON, CONFIGURED_LEAGUE_API_IDS],
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
