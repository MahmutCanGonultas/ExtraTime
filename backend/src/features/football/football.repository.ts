import { query } from '../../db/pool'
import { CONFIGURED_LEAGUE_API_IDS } from './leagues.config'
import { buildBracket, type Bracket, type BracketFixture } from './bracket'

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
  elapsed: number | null
  leagueName: string
  leagueApiId: number
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
  elapsed: number | null
  league_name: string
  league_api_id: number
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
    elapsed: r.elapsed,
    leagueName: r.league_name,
    leagueApiId: r.league_api_id,
    home: { id: r.home_id, apiFootballId: r.home_api_id, name: r.home_name },
    away: { id: r.away_id, apiFootballId: r.away_api_id, name: r.away_name },
    homeScore: r.home_score,
    awayScore: r.away_score,
    halftimeHome: r.halftime_home,
    halftimeAway: r.halftime_away,
  }
}

const FIXTURE_SELECT = `
  SELECT f.id, f.api_football_id, f.kickoff_at, f.status, f.round, f.elapsed,
         f.home_score, f.away_score, f.halftime_home, f.halftime_away,
         lg.name AS league_name, lg.api_football_id AS league_api_id,
         ht.id AS home_id, ht.api_football_id AS home_api_id, ht.name AS home_name,
         at.id AS away_id, at.api_football_id AS away_api_id, at.name AS away_name
  FROM fixtures f
  JOIN leagues lg ON lg.id = f.league_id
  JOIN teams ht ON ht.id = f.home_team_id
  JOIN teams at ON at.id = f.away_team_id`

// Returns every league-season by default so the UI can browse history; pass
// activeOnly for just the active seasons (e.g. the home page).
//
// Each row also gets `isCurrent`: the ONE season per competition to feature right
// now. Two seasons are flagged active during the season change-over, but only one
// is truly current — the one with a live match, else the one whose next match is
// soonest, else the newest. This is derived from the fixtures, not a hard-coded
// year, so it stays right as time passes.
export async function listLeagues(activeOnly = false) {
  const { rows } = await query<{
    id: number
    apiFootballId: number
    name: string
    country: string | null
    season: number
    logoUrl: string | null
    isActive: boolean
    hasLive: number | null
    nextKick: Date | null
  }>(
    `SELECT l.id, l.api_football_id AS "apiFootballId", l.name, l.country, l.season,
            l.logo_url AS "logoUrl", l.is_active AS "isActive",
            agg.has_live AS "hasLive", agg.next_kick AS "nextKick"
     FROM leagues l
     LEFT JOIN (
       SELECT league_id,
              max(CASE WHEN status IN ('1H','HT','2H','ET','BT','P','LIVE','SUSP','INT')
                       THEN 1 ELSE 0 END) AS has_live,
              min(CASE WHEN status = 'NS' AND kickoff_at > now() THEN kickoff_at END) AS next_kick
       FROM fixtures GROUP BY league_id
     ) agg ON agg.league_id = l.id
     ${activeOnly ? 'WHERE l.is_active = true' : ''}
     ORDER BY l.name ASC, l.season DESC`,
  )

  // Pick the single current season per competition.
  const byComp = new Map<number, typeof rows>()
  for (const r of rows) {
    const list = byComp.get(r.apiFootballId) ?? []
    list.push(r)
    byComp.set(r.apiFootballId, list)
  }
  const currentIds = new Set<number>()
  for (const list of byComp.values()) {
    const best = [...list]
      .map((r) => ({
        id: r.id,
        season: r.season,
        score: Number(r.hasLive) > 0 ? 2 : r.nextKick ? 1 : 0,
        nextKick: r.nextKick ? new Date(r.nextKick).getTime() : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => b.score - a.score || (a.score === 1 ? a.nextKick - b.nextKick : b.season - a.season))[0]
    if (best) currentIds.add(best.id)
  }

  return rows.map((r) => ({
    id: r.id,
    apiFootballId: r.apiFootballId,
    name: r.name,
    country: r.country,
    season: r.season,
    logoUrl: r.logoUrl,
    isActive: r.isActive,
    isCurrent: currentIds.has(r.id),
  }))
}

export async function getStandings(leagueId: number) {
  const { rows } = await query(
    `SELECT s.position, s.played, s.won, s.drawn, s.lost, s.goals_for AS "goalsFor",
            s.goals_against AS "goalsAgainst", s.points, s.form, s.group_label AS "groupLabel",
            s.description,
            t.id AS "teamId", t.api_football_id AS "teamApiId", t.name AS "teamName"
     FROM standings s JOIN teams t ON t.id = s.team_id
     WHERE s.league_id = $1
     ORDER BY s.group_label NULLS FIRST, s.position`,
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

// Knockout bracket for a tournament (World Cup, Champions League). Reads the
// competition's fixtures and lets the pure builder assemble the tree.
export async function getBracket(leagueId: number): Promise<Bracket> {
  const { rows } = await query<{
    fixtureId: number
    round: string | null
    status: string
    kickoffAt: Date
    homeScore: number | null
    awayScore: number | null
    penaltyHome: number | null
    penaltyAway: number | null
    homeTeamId: number
    homeApiId: number
    homeName: string
    awayTeamId: number
    awayApiId: number
    awayName: string
  }>(
    `SELECT f.id AS "fixtureId", f.round, f.status, f.kickoff_at AS "kickoffAt",
            f.home_score AS "homeScore", f.away_score AS "awayScore",
            f.penalty_home AS "penaltyHome", f.penalty_away AS "penaltyAway",
            ht.id AS "homeTeamId", ht.api_football_id AS "homeApiId", ht.name AS "homeName",
            at.id AS "awayTeamId", at.api_football_id AS "awayApiId", at.name AS "awayName"
     FROM fixtures f
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     WHERE f.league_id = $1
     ORDER BY f.kickoff_at`,
    [leagueId],
  )
  const fixtures: BracketFixture[] = rows.map((r) => ({
    fixtureId: r.fixtureId,
    round: r.round,
    status: r.status,
    kickoffAt: r.kickoffAt.toISOString(),
    home: { teamId: r.homeTeamId, apiId: r.homeApiId, name: r.homeName },
    away: { teamId: r.awayTeamId, apiId: r.awayApiId, name: r.awayName },
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    penaltyHome: r.penaltyHome,
    penaltyAway: r.penaltyAway,
  }))
  return buildBracket(fixtures)
}

export async function getTopScorers(leagueId: number) {
  const { rows } = await query(
    `SELECT ts.rank, ts.player_name AS "playerName", ts.player_api_id AS "playerApiId",
            ts.goals, ts.penalties, ts.appearances,
            t.id AS "teamId", t.api_football_id AS "teamApiId", t.name AS "teamName"
     FROM top_scorers ts LEFT JOIN teams t ON t.id = ts.team_id
     WHERE ts.league_id = $1 ORDER BY ts.rank`,
    [leagueId],
  )
  return rows
}

export async function getTopAssists(leagueId: number) {
  const { rows } = await query(
    `SELECT ta.rank, ta.player_name AS "playerName", ta.player_api_id AS "playerApiId",
            ta.assists, ta.appearances,
            t.id AS "teamId", t.api_football_id AS "teamApiId", t.name AS "teamName"
     FROM top_assists ta LEFT JOIN teams t ON t.id = ta.team_id
     WHERE ta.league_id = $1 ORDER BY ta.rank`,
    [leagueId],
  )
  return rows
}

export interface PlayerRow {
  playerApiId: number
  name: string
  teamApiId: number | null
  teamName: string | null
  position: string | null
  nationality: string | null
  age: number | null
  appearances: number | null
  minutes: number | null
  goals: number | null
  assists: number | null
  yellowCards: number | null
  redCards: number | null
  rating: number | null
  photoUrl: string | null
}

// The full player list for a league-season, best scorers first — the roster the
// "Oyuncular" tab renders and filters client-side.
export async function getLeaguePlayers(leagueId: number): Promise<PlayerRow[]> {
  const { rows } = await query<PlayerRow>(
    `SELECT player_api_id AS "playerApiId", name, team_api_id AS "teamApiId", team_name AS "teamName",
            position, nationality, age, appearances, minutes, goals, assists,
            yellow_cards AS "yellowCards", red_cards AS "redCards", rating::float8 AS rating,
            photo_url AS "photoUrl"
     FROM players WHERE league_id = $1
     ORDER BY goals DESC NULLS LAST, assists DESC NULLS LAST, appearances DESC NULLS LAST, name`,
    [leagueId],
  )
  return rows
}

export interface GamePoolPlayer {
  playerApiId: number
  name: string
  teamApiId: number | null
  teamName: string | null
  leagueApiId: number
  goals: number
  assists: number
  appearances: number
  minutes: number
  rating: number | null
  photoUrl: string | null
}

// A shuffled pool of regular players for the standalone "Gol Düellosu" mini-game.
// Weighted toward top-5 teams (recognisable names) but not exclusively them, and
// carrying several stats so the game can compare more than just goals.
export async function getPlayerGamePool(): Promise<GamePoolPlayer[]> {
  const cols = `p.player_api_id AS "playerApiId", p.name, p.team_api_id AS "teamApiId",
     p.team_name AS "teamName", l.api_football_id AS "leagueApiId", p.goals, p.assists,
     p.appearances, p.minutes, p.rating::float8 AS rating, p.photo_url AS "photoUrl"`
  const from = `players p JOIN leagues l ON l.id = p.league_id`
  const base = `p.appearances >= 10 AND p.photo_url IS NOT NULL`
  // Players whose team finished in the top 5 of its (flat, domestic) standings.
  const isTop5 = `EXISTS (
      SELECT 1 FROM standings s JOIN teams t ON t.id = s.team_id
      WHERE s.league_id = p.league_id AND t.api_football_id = p.team_api_id AND s.position <= 5
    )`
  const { rows } = await query<GamePoolPlayer>(
    `(SELECT ${cols} FROM ${from} WHERE ${base} AND ${isTop5} ORDER BY random() LIMIT 200)
     UNION ALL
     (SELECT ${cols} FROM ${from} WHERE ${base} AND NOT ${isTop5} ORDER BY random() LIMIT 70)`,
  )
  return rows
}

export interface PlayerProfile {
  playerApiId: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  nationality: string | null
  position: string | null
  height: string | null
  weight: string | null
  photoUrl: string | null
  seasons: Array<{
    leagueId: number
    leagueName: string
    leagueApiId: number
    season: number
    teamApiId: number | null
    teamName: string | null
    appearances: number | null
    minutes: number | null
    goals: number | null
    assists: number | null
    yellowCards: number | null
    redCards: number | null
    rating: number | null
  }>
}

// One player's profile plus every league-season of theirs we hold, newest first.
export async function getPlayerProfile(playerApiId: number): Promise<PlayerProfile | null> {
  const { rows } = await query<{
    playerApiId: number
    name: string
    firstname: string | null
    lastname: string | null
    age: number | null
    nationality: string | null
    position: string | null
    height: string | null
    weight: string | null
    photoUrl: string | null
    leagueId: number
    leagueName: string
    leagueApiId: number
    season: number
    teamApiId: number | null
    teamName: string | null
    appearances: number | null
    minutes: number | null
    goals: number | null
    assists: number | null
    yellowCards: number | null
    redCards: number | null
    rating: number | null
  }>(
    `SELECT p.player_api_id AS "playerApiId", p.name, p.firstname, p.lastname, p.age, p.nationality,
            p.position, p.height, p.weight, p.photo_url AS "photoUrl",
            l.id AS "leagueId", l.name AS "leagueName", l.api_football_id AS "leagueApiId", p.season,
            p.team_api_id AS "teamApiId", p.team_name AS "teamName", p.appearances, p.minutes,
            p.goals, p.assists, p.yellow_cards AS "yellowCards", p.red_cards AS "redCards",
            p.rating::float8 AS rating
     FROM players p JOIN leagues l ON l.id = p.league_id
     WHERE p.player_api_id = $1
     ORDER BY p.season DESC, p.goals DESC NULLS LAST`,
    [playerApiId],
  )
  if (rows.length === 0) return null
  const head = rows[0]
  return {
    playerApiId: head.playerApiId,
    name: head.name,
    firstname: head.firstname,
    lastname: head.lastname,
    age: head.age,
    nationality: head.nationality,
    position: head.position,
    height: head.height,
    weight: head.weight,
    photoUrl: head.photoUrl,
    seasons: rows.map((r) => ({
      leagueId: r.leagueId,
      leagueName: r.leagueName,
      leagueApiId: r.leagueApiId,
      season: r.season,
      teamApiId: r.teamApiId,
      teamName: r.teamName,
      appearances: r.appearances,
      minutes: r.minutes,
      goals: r.goals,
      assists: r.assists,
      yellowCards: r.yellowCards,
      redCards: r.redCards,
      rating: r.rating,
    })),
  }
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

export interface LiveFixtureDTO extends FixtureDTO {
  goals: FixtureGoal[]
}

// Matches currently in progress, restricted to our configured competitions, each
// with its goal scorers attached (one extra query for the whole set).
export async function getLiveFixtures(): Promise<LiveFixtureDTO[]> {
  const { rows } = await query<FixtureRow>(
    `${FIXTURE_SELECT}
     WHERE lg.api_football_id = ANY($1)
       AND f.status IN ('1H','HT','2H','ET','BT','P','LIVE','SUSP','INT')
     ORDER BY f.kickoff_at`,
    [CONFIGURED_LEAGUE_API_IDS],
  )
  const fixtures = rows.map(mapFixture)
  if (fixtures.length === 0) return []

  const goalsRes = await query<FixtureGoal & { fixtureId: number }>(
    `SELECT fixture_id AS "fixtureId", team_api_id AS "teamApiId", player_name AS "playerName",
            assist_name AS "assistName", minute, detail
     FROM fixture_goals WHERE fixture_id = ANY($1)
     ORDER BY minute NULLS LAST, id`,
    [fixtures.map((f) => f.id)],
  )
  const byFixture = new Map<number, FixtureGoal[]>()
  for (const row of goalsRes.rows) {
    const { fixtureId, ...goal } = row
    const list = byFixture.get(fixtureId) ?? []
    list.push(goal)
    byFixture.set(fixtureId, list)
  }
  return fixtures.map((f) => ({ ...f, goals: byFixture.get(f.id) ?? [] }))
}

// Soonest upcoming matches in our ACTIVE, configured competitions — bounded so
// we never ship hundreds of rows.
export async function getUpcomingFixtures(limit = 12): Promise<FixtureDTO[]> {
  const { rows } = await query<FixtureRow>(
    `${FIXTURE_SELECT}
     WHERE lg.is_active = true AND lg.api_football_id = ANY($2)
       AND f.status = 'NS' AND f.kickoff_at > now()
     ORDER BY f.kickoff_at ASC
     LIMIT $1`,
    [limit, CONFIGURED_LEAGUE_API_IDS],
  )
  return rows.map(mapFixture)
}

// Most recent finished matches in our ACTIVE, configured competitions.
export async function getRecentFixtures(limit = 12): Promise<FixtureDTO[]> {
  const { rows } = await query<FixtureRow>(
    `${FIXTURE_SELECT}
     WHERE lg.is_active = true AND lg.api_football_id = ANY($2)
       AND f.status IN ('FT','AET','PEN')
     ORDER BY f.kickoff_at DESC
     LIMIT $1`,
    [limit, CONFIGURED_LEAGUE_API_IDS],
  )
  return rows.map(mapFixture)
}

export interface FixtureGoal {
  teamApiId: number
  playerName: string
  assistName: string | null
  minute: number | null
  detail: string | null
}

export interface FixtureEvent {
  teamApiId: number | null
  minute: number | null
  extraMinute: number | null
  type: string
  detail: string | null
  playerName: string | null
  assistName: string | null
}

// Full event feed for one fixture (goals, cards, subs) in match order.
export async function getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]> {
  const { rows } = await query<FixtureEvent>(
    `SELECT team_api_id AS "teamApiId", minute, extra_minute AS "extraMinute", type, detail,
            player_name AS "playerName", assist_name AS "assistName"
     FROM fixture_events WHERE fixture_id = $1 ORDER BY sort_order`,
    [fixtureId],
  )
  return rows
}

export interface FixtureStat {
  teamApiId: number
  type: string
  value: string | null
}

// Per-team statistics rows for one fixture (the UI pivots them home vs away).
export async function getFixtureStats(fixtureId: number): Promise<FixtureStat[]> {
  const { rows } = await query<FixtureStat>(
    `SELECT team_api_id AS "teamApiId", type, value
     FROM fixture_stats WHERE fixture_id = $1`,
    [fixtureId],
  )
  return rows
}

// Goal timeline for one fixture (who scored, when), ordered chronologically.
export async function getFixtureGoals(fixtureId: number): Promise<FixtureGoal[]> {
  const { rows } = await query<FixtureGoal>(
    `SELECT team_api_id AS "teamApiId", player_name AS "playerName",
            assist_name AS "assistName", minute, detail
     FROM fixture_goals WHERE fixture_id = $1
     ORDER BY minute NULLS LAST, id`,
    [fixtureId],
  )
  return rows
}
