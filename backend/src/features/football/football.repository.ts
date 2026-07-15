import { query } from '../../db/pool'

// Read side of the football cache. Every one of these serves from Postgres and
// never touches API-Football.

export interface TeamRef {
  id: number
  apiFootballId: number
  name: string
}

export interface FixtureDTO {
  id: number
  apiFootballId: number
  kickoffAt: string
  status: string
  round: string | null
  home: TeamRef
  away: TeamRef
  homeScore: number | null
  awayScore: number | null
  halftimeHome: number | null
  halftimeAway: number | null
}

interface FixtureRow {
  id: number
  api_football_id: number
  kickoff_at: Date
  status: string
  round: string | null
  home_score: number | null
  away_score: number | null
  halftime_home: number | null
  halftime_away: number | null
  home_id: number
  home_api_id: number
  home_name: string
  away_id: number
  away_api_id: number
  away_name: string
}

function mapFixture(r: FixtureRow): FixtureDTO {
  return {
    id: r.id,
    apiFootballId: r.api_football_id,
    kickoffAt: r.kickoff_at.toISOString(),
    status: r.status,
    round: r.round,
    home: { id: r.home_id, apiFootballId: r.home_api_id, name: r.home_name },
    away: { id: r.away_id, apiFootballId: r.away_api_id, name: r.away_name },
    homeScore: r.home_score,
    awayScore: r.away_score,
    halftimeHome: r.halftime_home,
    halftimeAway: r.halftime_away,
  }
}

const FIXTURE_SELECT = `
  SELECT f.id, f.api_football_id, f.kickoff_at, f.status, f.round,
         f.home_score, f.away_score, f.halftime_home, f.halftime_away,
         ht.id AS home_id, ht.api_football_id AS home_api_id, ht.name AS home_name,
         at.id AS away_id, at.api_football_id AS away_api_id, at.name AS away_name
  FROM fixtures f
  JOIN teams ht ON ht.id = f.home_team_id
  JOIN teams at ON at.id = f.away_team_id`

export async function listActiveLeagues() {
  const { rows } = await query(
    `SELECT id, api_football_id AS "apiFootballId", name, country, season, logo_url AS "logoUrl", is_active AS "isActive"
     FROM leagues WHERE is_active = true ORDER BY id`,
  )
  return rows
}

export async function getStandings(leagueId: number) {
  const { rows } = await query(
    `SELECT s.position, s.played, s.won, s.drawn, s.lost, s.goals_for AS "goalsFor",
            s.goals_against AS "goalsAgainst", s.points, s.form,
            t.id AS "teamId", t.api_football_id AS "teamApiId", t.name AS "teamName"
     FROM standings s JOIN teams t ON t.id = s.team_id
     WHERE s.league_id = $1 ORDER BY s.position`,
    [leagueId],
  )
  return rows
}

export type FixtureFilter = 'upcoming' | 'finished' | 'all'

export async function getLeagueFixtures(
  leagueId: number,
  filter: FixtureFilter = 'all',
  round?: string,
): Promise<FixtureDTO[]> {
  const params: unknown[] = [leagueId]
  let where = 'WHERE f.league_id = $1'
  if (filter === 'upcoming') where += " AND f.status = 'NS' AND f.kickoff_at > now()"
  if (filter === 'finished') where += " AND f.status IN ('FT','AET','PEN')"
  if (round) {
    params.push(round)
    where += ` AND f.round = $${params.length}`
  }
  const order = filter === 'finished' ? 'ORDER BY f.kickoff_at DESC' : 'ORDER BY f.kickoff_at ASC'
  const { rows } = await query<FixtureRow>(`${FIXTURE_SELECT} ${where} ${order}`, params)
  return rows.map(mapFixture)
}

export async function getTopScorers(leagueId: number) {
  const { rows } = await query(
    `SELECT ts.rank, ts.player_name AS "playerName", ts.goals, ts.penalties, ts.appearances,
            t.id AS "teamId", t.api_football_id AS "teamApiId", t.name AS "teamName"
     FROM top_scorers ts LEFT JOIN teams t ON t.id = ts.team_id
     WHERE ts.league_id = $1 ORDER BY ts.rank`,
    [leagueId],
  )
  return rows
}

export async function getTopAssists(leagueId: number) {
  const { rows } = await query(
    `SELECT ta.rank, ta.player_name AS "playerName", ta.assists, ta.appearances,
            t.id AS "teamId", t.api_football_id AS "teamApiId", t.name AS "teamName"
     FROM top_assists ta LEFT JOIN teams t ON t.id = ta.team_id
     WHERE ta.league_id = $1 ORDER BY ta.rank`,
    [leagueId],
  )
  return rows
}

export async function getTeam(teamId: number) {
  const { rows } = await query(
    `SELECT id, api_football_id AS "apiFootballId", name, short_name AS "shortName",
            stadium_name AS "stadiumName", city
     FROM teams WHERE id = $1`,
    [teamId],
  )
  return rows[0] ?? null
}

export async function getTeamFixtures(teamId: number): Promise<FixtureDTO[]> {
  const { rows } = await query<FixtureRow>(
    `${FIXTURE_SELECT} WHERE f.home_team_id = $1 OR f.away_team_id = $1 ORDER BY f.kickoff_at DESC LIMIT 20`,
    [teamId],
  )
  return rows.map(mapFixture)
}

export async function getFixtureById(fixtureId: number): Promise<FixtureDTO | null> {
  const { rows } = await query<FixtureRow>(`${FIXTURE_SELECT} WHERE f.id = $1`, [fixtureId])
  return rows[0] ? mapFixture(rows[0]) : null
}
