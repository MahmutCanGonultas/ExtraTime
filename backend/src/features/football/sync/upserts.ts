import type { PoolClient } from 'pg'
import type {
  RawFixture,
  RawFixtureEvent,
  RawFixtureStatistic,
  RawPlayer,
  RawStandingRow,
  RawTopScorer,
} from '../types'

// All writes go through a PoolClient so a sync can wrap a whole league in one
// transaction. Every statement is parameterized — never string-concatenated.

export async function upsertTeam(
  db: PoolClient,
  apiId: number,
  name: string,
  extra: { stadium?: string | null; city?: string | null } = {},
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO teams (api_football_id, name, stadium_name, city)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (api_football_id) DO UPDATE
       SET name = EXCLUDED.name,
           stadium_name = COALESCE(EXCLUDED.stadium_name, teams.stadium_name),
           city = COALESCE(EXCLUDED.city, teams.city),
           updated_at = now()
     RETURNING id`,
    [apiId, name, extra.stadium ?? null, extra.city ?? null],
  )
  return rows[0].id
}

export interface TeamInput {
  apiId: number
  name: string
  stadium?: string | null
  city?: string | null
}

// Collects the unique teams from a fixtures response (a team appears in many
// matches). Deduping is required: a batch INSERT ... ON CONFLICT cannot touch
// the same row twice. Venue info comes from the home side.
export function collectTeams(fixtures: RawFixture[]): TeamInput[] {
  const map = new Map<number, TeamInput>()
  for (const f of fixtures) {
    const prevHome = map.get(f.teams.home.id)
    map.set(f.teams.home.id, {
      apiId: f.teams.home.id,
      name: f.teams.home.name,
      stadium: f.fixture.venue.name ?? prevHome?.stadium ?? null,
      city: f.fixture.venue.city ?? prevHome?.city ?? null,
    })
    if (!map.has(f.teams.away.id)) {
      map.set(f.teams.away.id, { apiId: f.teams.away.id, name: f.teams.away.name })
    }
  }
  return [...map.values()]
}

// One multi-row UPSERT for all (deduped) teams, returning api_football_id -> id.
export async function upsertTeamsBatch(
  db: PoolClient,
  teams: TeamInput[],
): Promise<Map<number, number>> {
  const idByApiId = new Map<number, number>()
  if (teams.length === 0) return idByApiId

  const params: unknown[] = []
  const tuples = teams.map((t) => {
    params.push(t.apiId, t.name, t.stadium ?? null, t.city ?? null)
    const n = params.length
    return `($${n - 3}, $${n - 2}, $${n - 1}, $${n})`
  })

  const { rows } = await db.query<{ id: number; api_football_id: number }>(
    `INSERT INTO teams (api_football_id, name, stadium_name, city)
     VALUES ${tuples.join(', ')}
     ON CONFLICT (api_football_id) DO UPDATE SET
       name = EXCLUDED.name,
       stadium_name = COALESCE(EXCLUDED.stadium_name, teams.stadium_name),
       city = COALESCE(EXCLUDED.city, teams.city),
       updated_at = now()
     RETURNING id, api_football_id`,
    params,
  )
  for (const r of rows) idByApiId.set(r.api_football_id, r.id)
  return idByApiId
}

// One multi-row UPSERT for all fixtures of a league. Fixtures whose teams didn't
// resolve are skipped defensively.
export async function upsertFixturesBatch(
  db: PoolClient,
  leagueId: number,
  fixtures: RawFixture[],
  teamIds: Map<number, number>,
): Promise<number> {
  const seen = new Set<number>()
  const valid = fixtures.filter((f) => {
    if (!teamIds.has(f.teams.home.id) || !teamIds.has(f.teams.away.id)) return false
    if (seen.has(f.fixture.id)) return false
    seen.add(f.fixture.id)
    return true
  })
  if (valid.length === 0) return 0

  const params: unknown[] = []
  const tuples = valid.map((f) => {
    params.push(
      f.fixture.id,
      leagueId,
      teamIds.get(f.teams.home.id),
      teamIds.get(f.teams.away.id),
      f.fixture.date,
      f.fixture.status.short,
      f.goals.home,
      f.goals.away,
      f.score.halftime.home,
      f.score.halftime.away,
      f.league.round,
      f.fixture.status.elapsed,
      f.score.penalty?.home ?? null,
      f.score.penalty?.away ?? null,
    )
    const n = params.length
    return `($${n - 13}, $${n - 12}, $${n - 11}, $${n - 10}, $${n - 9}, $${n - 8}, $${n - 7}, $${n - 6}, $${n - 5}, $${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`
  })

  await db.query(
    `INSERT INTO fixtures (
       api_football_id, league_id, home_team_id, away_team_id, kickoff_at, status,
       home_score, away_score, halftime_home, halftime_away, round, elapsed,
       penalty_home, penalty_away
     )
     VALUES ${tuples.join(', ')}
     ON CONFLICT (api_football_id) DO UPDATE SET
       kickoff_at = EXCLUDED.kickoff_at,
       status = EXCLUDED.status,
       home_score = EXCLUDED.home_score,
       away_score = EXCLUDED.away_score,
       halftime_home = EXCLUDED.halftime_home,
       halftime_away = EXCLUDED.halftime_away,
       round = EXCLUDED.round,
       elapsed = EXCLUDED.elapsed,
       penalty_home = EXCLUDED.penalty_home,
       penalty_away = EXCLUDED.penalty_away,
       updated_at = now()`,
    params,
  )
  return valid.length
}

// Replace the goal list for one fixture (delete + re-insert), so a VAR reversal
// simply drops the goal on the next sync. Only 'Goal' events are stored.
export async function replaceFixtureGoals(
  db: PoolClient,
  fixtureId: number,
  events: RawFixtureEvent[],
): Promise<number> {
  await db.query('DELETE FROM fixture_goals WHERE fixture_id = $1', [fixtureId])
  const goals = events.filter((e) => e.type === 'Goal' && e.detail !== 'Missed Penalty')
  let n = 0
  for (const g of goals) {
    if (!g.player.name) continue
    await db.query(
      `INSERT INTO fixture_goals (fixture_id, team_api_id, player_name, assist_name, minute, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fixtureId, g.team.id, g.player.name, g.assist?.name ?? null, g.time.elapsed, g.detail],
    )
    n += 1
  }
  return n
}

// Full event feed for a fixture (goals, cards, substitutions), replacing any
// prior feed so VAR reversals simply drop off on the next sync.
export async function replaceFixtureEvents(
  db: PoolClient,
  fixtureId: number,
  events: RawFixtureEvent[],
): Promise<number> {
  await db.query('DELETE FROM fixture_events WHERE fixture_id = $1', [fixtureId])
  let order = 0
  for (const e of events) {
    await db.query(
      `INSERT INTO fixture_events
         (fixture_id, team_api_id, minute, extra_minute, type, detail, player_name, assist_name, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        fixtureId,
        e.team?.id ?? null,
        e.time?.elapsed ?? null,
        e.time?.extra ?? null,
        e.type,
        e.detail,
        e.player?.name ?? null,
        e.assist?.name ?? null,
        order,
      ],
    )
    order += 1
  }
  return order
}

// Per-team match statistics (possession, shots, ...), stored as key/value.
export async function replaceFixtureStats(
  db: PoolClient,
  fixtureId: number,
  stats: RawFixtureStatistic[],
): Promise<number> {
  await db.query('DELETE FROM fixture_stats WHERE fixture_id = $1', [fixtureId])
  let n = 0
  for (const team of stats) {
    for (const s of team.statistics) {
      await db.query(
        `INSERT INTO fixture_stats (fixture_id, team_api_id, type, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (fixture_id, team_api_id, type) DO UPDATE SET value = EXCLUDED.value`,
        [fixtureId, team.team.id, s.type, s.value == null ? null : String(s.value)],
      )
      n += 1
    }
  }
  return n
}

export async function upsertStanding(
  db: PoolClient,
  leagueId: number,
  row: RawStandingRow,
): Promise<void> {
  const teamId = await upsertTeam(db, row.team.id, row.team.name)
  await db.query(
    `INSERT INTO standings (
       league_id, team_id, position, played, won, drawn, lost,
       goals_for, goals_against, points, form, group_label, description
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
       description = EXCLUDED.description,
       updated_at = now()`,
    [
      leagueId,
      teamId,
      row.rank,
      row.all.played,
      row.all.win,
      row.all.draw,
      row.all.lose,
      row.all.goals.for,
      row.all.goals.against,
      row.points,
      row.form,
      row.group,
      row.description,
    ],
  )
}

// Snapshot lists: replace the whole league list so players who dropped off the
// leaderboard disappear. We assign our own sequential rank to satisfy
// UNIQUE(league_id, rank) even when the API reports tied ranks.
export async function replaceTopScorers(
  db: PoolClient,
  leagueId: number,
  scorers: RawTopScorer[],
): Promise<number> {
  await db.query('DELETE FROM top_scorers WHERE league_id = $1', [leagueId])
  let rank = 0
  for (const s of scorers) {
    const stat = s.statistics[0]
    if (!stat) continue
    rank += 1
    const teamId = await upsertTeam(db, stat.team.id, stat.team.name)
    await db.query(
      `INSERT INTO top_scorers (league_id, player_name, player_api_id, team_id, goals, penalties, appearances, rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [leagueId, s.player.name, s.player.id, teamId, stat.goals.total ?? 0, stat.penalty.scored, stat.games.appearences, rank],
    )
  }
  return rank
}

export async function replaceTopAssists(
  db: PoolClient,
  leagueId: number,
  assisters: RawTopScorer[],
): Promise<number> {
  await db.query('DELETE FROM top_assists WHERE league_id = $1', [leagueId])
  let rank = 0
  for (const a of assisters) {
    const stat = a.statistics[0]
    if (!stat) continue
    rank += 1
    const teamId = await upsertTeam(db, stat.team.id, stat.team.name)
    await db.query(
      `INSERT INTO top_assists (league_id, player_name, player_api_id, team_id, assists, appearances, rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [leagueId, a.player.name, a.player.id, teamId, stat.goals.assists ?? 0, stat.games.appearences, rank],
    )
  }
  return rank
}

// One player's profile + stats for a league-season. `leagueApiId` disambiguates
// when a player has stats in several competitions in the same response.
export async function upsertPlayer(
  db: PoolClient,
  leagueId: number,
  leagueApiId: number,
  season: number,
  raw: RawPlayer,
): Promise<number> {
  const stat = raw.statistics.find((s) => s.league.id === leagueApiId) ?? raw.statistics[0]
  if (!stat) return 0
  const p = raw.player
  const rating = stat.games.rating != null && stat.games.rating !== '' ? Number(stat.games.rating) : null
  await db.query(
    `INSERT INTO players (
       player_api_id, league_id, season, team_api_id, team_name, name, firstname, lastname,
       age, nationality, position, height, weight, photo_url,
       appearances, minutes, goals, assists, yellow_cards, red_cards, rating
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     ON CONFLICT (player_api_id, league_id, season) DO UPDATE SET
       team_api_id = EXCLUDED.team_api_id, team_name = EXCLUDED.team_name, name = EXCLUDED.name,
       firstname = EXCLUDED.firstname, lastname = EXCLUDED.lastname, age = EXCLUDED.age,
       nationality = EXCLUDED.nationality, position = EXCLUDED.position, height = EXCLUDED.height,
       weight = EXCLUDED.weight, photo_url = EXCLUDED.photo_url, appearances = EXCLUDED.appearances,
       minutes = EXCLUDED.minutes, goals = EXCLUDED.goals, assists = EXCLUDED.assists,
       yellow_cards = EXCLUDED.yellow_cards, red_cards = EXCLUDED.red_cards, rating = EXCLUDED.rating,
       updated_at = now()`,
    [
      p.id, leagueId, season, stat.team.id, stat.team.name, p.name, p.firstname, p.lastname,
      p.age, p.nationality, stat.games.position, p.height, p.weight, p.photo,
      stat.games.appearences, stat.games.minutes, stat.goals.total ?? 0, stat.goals.assists ?? 0,
      stat.cards.yellow ?? 0, stat.cards.red ?? 0, rating,
    ],
  )
  return 1
}
