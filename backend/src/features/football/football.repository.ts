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

export interface GuessPoolPlayer {
  playerApiId: number
  name: string
  photoUrl: string | null
  nationality: string | null
  position: string | null
  age: number | null
  teamApiId: number | null
  teamName: string | null
  leagueApiId: number
  leagueName: string
  jerseyNumber: number | null
  appearances: number
}

// The "guess the player" universe: each player's most recent CLUB row from this
// season on (so we prefer their current 2026-27 club, but a well-known player
// whose current club squad we lack — e.g. Modrić, whose only 2026 row is the
// national team — still appears via his last club rather than vanishing).
const GUESS_MIN_SEASON = 2025
// The answer is drawn only from established top divisions so it stays
// recognisable...
const GUESS_POOL_LEAGUES = [39, 140, 78, 61, 135, 94, 88, 71, 307]
// ...but a guess can be ANY player across those plus the second divisions and
// MLS, so the dictionary is comprehensive.
const GUESS_SEARCH_LEAGUES = [
  ...GUESS_POOL_LEAGUES,
  253, // MLS
  40, // Championship (England)
  141, // La Liga 2 (Spain)
  79, // 2. Bundesliga (Germany)
  95, // Liga Portugal 2
  204, // TFF 1. Lig (Turkey)
]
// The four biggest Turkish clubs, guessable in Kim Bu. This ONE list feeds both
// the answer pool (getGuessPool default) and the search universe, so a Trabzonspor
// player (e.g. Onuachu) can never be the secret yet be missing from the search.
const GUESS_TURKISH_CLUBS = [611, 645, 549, 998] // Fenerbahçe, Galatasaray, Beşiktaş, Trabzonspor
const GUESS_EXTRA_LEAGUE = 203 // Süper Lig, but only the four clubs above
const GUESS_EXTRA_CLUBS = GUESS_TURKISH_CLUBS

// MLS + the second divisions. These are guessable, but they are only used as a
// player's *shown* club when he has no top-flight row — so a superstar with a
// stray/erroneous MLS squad entry (e.g. Lewandowski briefly listed at an MLS
// club) still reads as his real top-flight club, matching the answer pool, while
// a genuine MLS-only player (Messi at Inter Miami) keeps his MLS club.
const GUESS_SECONDARY_LEAGUES = [253, 40, 141, 79, 95, 204]

// Continental club cups (Champions / Europa / Conference League). A player's row
// in one of these names the club he played that tie for, which can be a former
// or loan club — so for "current club" a same-season domestic-league row wins.
const CUP_LEAGUE_API_IDS = new Set([2, 3, 848])

// Secondary club leagues (MLS + the second divisions). Used when picking a player's
// CURRENT club: a top-flight row always beats one of these, so a superstar with a
// stray/erroneous secondary-league squad row still reads as his real club.
const SECONDARY_CLUB_LEAGUES = new Set(GUESS_SECONDARY_LEAGUES)

// Shared column list + FROM/WHERE so the pool and the autocomplete stay in
// lockstep (same universe, same current-season rows). $1=season, $2=big5 ids,
// $3=extra league id, $4=extra club ids. "appearances" is the player's career
// peak, used purely to rank prominence (current preseason rows have none).
const GUESS_COLS = `p.player_api_id AS "playerApiId", p.name, p.photo_url AS "photoUrl",
    p.nationality, p.position, p.age, p.team_api_id AS "teamApiId", p.team_name AS "teamName",
    l.api_football_id AS "leagueApiId", l.name AS "leagueName", p.jersey_number AS "jerseyNumber",
    -- Total career appearances across every competition — a better fame proxy
    -- than a single peak season, so a superstar (club + CL + country) outranks a
    -- lower-league journeyman with one high-minutes season.
    (SELECT SUM(p2.appearances) FROM players p2 WHERE p2.player_api_id = p.player_api_id) AS appearances`
// A guessable player needs a photo and a nationality (for the flag); the shirt
// number is optional (shown as "?" when unknown) so recognisable players without
// a number in our data still appear. $1 = min season, so the DISTINCT ON below
// can pick each player's most recent club row.
const GUESS_UNIVERSE = `players p JOIN leagues l ON l.id = p.league_id
   WHERE p.season >= $1 AND p.photo_url IS NOT NULL AND p.nationality IS NOT NULL
     AND (l.api_football_id = ANY($2) OR (l.api_football_id = $3 AND p.team_api_id = ANY($4)))`

/**
 * Pool for the "guess the player" game: the current (2026-27) squads of the big
 * five leagues + Galatasaray/Fenerbahçe/Beşiktaş, one row per player, ordered by
 * career prominence so the answer stays recognisable. Team/age/number come from
 * the live squad, so a transferred-out player (e.g. Messi) never appears here.
 */
// Default answer pool: the five big leagues + the four biggest Turkish clubs. The
// player can widen or narrow this from the game screen (Kim Bu league selector).
export const GUESS_DEFAULT_LEAGUES = [140, 39, 78, 135, 61]
export const GUESS_DEFAULT_CLUBS = GUESS_TURKISH_CLUBS // FB, GS, BJK, Trabzonspor

export async function getGuessPool(
  leagueIds: number[] = GUESS_DEFAULT_LEAGUES,
  clubIds: number[] = GUESS_DEFAULT_CLUBS,
): Promise<GuessPoolPlayer[]> {
  const { rows } = await query<GuessPoolPlayer>(
    `SELECT * FROM (
       SELECT DISTINCT ON (p.player_api_id) ${GUESS_COLS}
       FROM players p JOIN leagues l ON l.id = p.league_id
       WHERE p.season >= $1 AND p.photo_url IS NOT NULL AND p.nationality IS NOT NULL
         AND (l.api_football_id = ANY($2) OR p.team_api_id = ANY($3))
       ORDER BY p.player_api_id, p.season DESC, p.appearances DESC NULLS LAST
     ) q
     ORDER BY q.appearances DESC NULLS LAST
     LIMIT 800`,
    [GUESS_MIN_SEASON, leagueIds, clubIds],
  )
  return rows
}

/**
 * Autocomplete for a guess: matches players in the SAME current-season universe
 * as the pool (so a guess can be scored on its current team), by name and
 * accent-insensitively. Ordered by prominence.
 */
export async function searchGuessPlayers(q: string): Promise<GuessPoolPlayer[]> {
  const like = `%${q}%`
  const prefix = `${q}%`
  const wordStart = `% ${q}%` // term starting a later word, e.g. "ronaldo" in "Cristiano Ronaldo"
  const { rows } = await query<GuessPoolPlayer>(
    `SELECT s."playerApiId", s.name, s."photoUrl", s.nationality, s.position, s.age,
            s."teamApiId", s."teamName", s."leagueApiId", s."leagueName",
            s."jerseyNumber", s.appearances
     FROM (
       SELECT DISTINCT ON (p.player_api_id) ${GUESS_COLS}, p.lastname AS "lastname"
       FROM ${GUESS_UNIVERSE}
         AND (unaccent(p.name) ILIKE unaccent($5)
           OR unaccent(p.firstname) ILIKE unaccent($5)
           OR unaccent(p.lastname) ILIKE unaccent($5)
           OR unaccent(COALESCE(p.firstname, '') || ' ' || COALESCE(p.lastname, '')) ILIKE unaccent($5)
           -- Typo tolerance: a fuzzy (trigram) match on the display name, so a
           -- misspelt guess ("onachu") still finds the player ("Onuachu").
           OR word_similarity(unaccent(lower($8)), unaccent(lower(p.name))) >= 0.5)
       -- Prefer a top-flight club over a secondary-league (MLS / 2nd-div) row, then
       -- the newest season — so the shown club is the player's real current club.
       ORDER BY p.player_api_id, (l.api_football_id = ANY($10)) ASC,
                p.season DESC, p.appearances DESC NULLS LAST
     ) s
     -- Rank most-relevant, best-known first: exact whole-surname matches, then
     -- prefix/word matches, each by prominence — so a superstar surfaces above
     -- obscure namesakes ("messi" → Lionel Messi, not "Messias").
     ORDER BY
       (unaccent(s.name) ILIKE unaccent($8) OR unaccent(s.name) ILIKE unaccent($9)) DESC,
       (unaccent(s.name) ILIKE unaccent($6)
        OR unaccent(s.name) ILIKE unaccent($7)
        OR unaccent(COALESCE(s."lastname", '')) ILIKE unaccent($6)) DESC,
       -- Any substring hit ranks above a purely fuzzy (typo) match, and among
       -- fuzzy matches the closest one wins.
       (unaccent(s.name) ILIKE unaccent($5)) DESC,
       word_similarity(unaccent(lower($8)), unaccent(lower(s.name))) DESC,
       s.appearances DESC NULLS LAST,
       s.name
     LIMIT 20`,
    [
      GUESS_MIN_SEASON,
      GUESS_SEARCH_LEAGUES,
      GUESS_EXTRA_LEAGUE,
      GUESS_EXTRA_CLUBS,
      like,
      prefix,
      wordStart,
      q,
      `% ${q}`,
      GUESS_SECONDARY_LEAGUES,
    ],
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
  birthDate: string | null
  birthPlace: string | null
  photoUrl: string | null
  // The player's current club (their most recent non-national-team row), so the
  // header shows where they play now rather than their most-capped old club.
  currentTeamId: number | null
  currentTeamApiId: number | null
  currentTeamName: string | null
  // The season of that club row. If it isn't the current campaign the player has
  // left/retired (e.g. Hazard's last Real Madrid season), so the UI can say so.
  currentTeamSeason: number | null
  seasons: Array<{
    leagueId: number
    leagueName: string
    leagueApiId: number
    season: number
    teamId: number | null
    teamApiId: number | null
    teamName: string | null
    appearances: number | null
    minutes: number | null
    goals: number | null
    assists: number | null
    yellowCards: number | null
    redCards: number | null
    rating: number | null
    // Raw API statistics blob (shots, passes, dribbles, duels, …) for the detail page.
    stats: Record<string, unknown> | null
  }>
}

// One player's profile plus every league-season of theirs we hold, newest first.
// Current age from a YYYY-MM-DD birth date — the API's per-season `age` goes
// stale (a player who left our leagues keeps their last-seen age).
function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const monthDiff = now.getMonth() - b.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age -= 1
  return age
}

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
    birthDate: string | null
    birthPlace: string | null
    photoUrl: string | null
    leagueId: number
    leagueName: string
    leagueApiId: number
    season: number
    teamId: number | null
    teamApiId: number | null
    teamName: string | null
    appearances: number | null
    minutes: number | null
    goals: number | null
    assists: number | null
    yellowCards: number | null
    redCards: number | null
    rating: number | null
    stats: Record<string, unknown> | null
  }>(
    `SELECT p.player_api_id AS "playerApiId", p.name, p.firstname, p.lastname, p.age, p.nationality,
            p.position, p.height, p.weight, p.birth_date AS "birthDate", p.birth_place AS "birthPlace",
            p.photo_url AS "photoUrl",
            l.id AS "leagueId", l.name AS "leagueName", l.api_football_id AS "leagueApiId", p.season,
            t.id AS "teamId", p.team_api_id AS "teamApiId", p.team_name AS "teamName",
            p.appearances, p.minutes, p.goals, p.assists,
            p.yellow_cards AS "yellowCards", p.red_cards AS "redCards", p.rating::float8 AS rating,
            p.stats
     FROM players p
     JOIN leagues l ON l.id = p.league_id
     LEFT JOIN teams t ON t.api_football_id = p.team_api_id
     WHERE p.player_api_id = $1
     ORDER BY p.season DESC, p.appearances DESC NULLS LAST, p.goals DESC NULLS LAST`,
    [playerApiId],
  )
  if (rows.length === 0) return null
  const head = rows[0]
  const birthDate = rows.find((r) => r.birthDate)?.birthDate ?? null
  // Current club: the most-recent season's DOMESTIC top-flight row. National-team
  // rows (league 1) are never a club. Within that season we then prefer, in order:
  // a top-flight domestic league, then any non-cup league, then anything. This
  // avoids two traps: a continental-cup row (Champions/Europa/Conference) can name
  // a loan or former club, and a secondary-league row (MLS / 2nd division) is often
  // a stray/erroneous API squad entry — e.g. Lewandowski wrongly listed at an MLS
  // club while really at Barcelona. A genuine MLS-only player (Messi at Inter Miami)
  // has no top-flight row, so he still falls through to his real club.
  const clubRows = rows.filter((r) => r.leagueApiId !== 1)
  const topSeason = clubRows[0]?.season
  const seasonRows = clubRows.filter((r) => r.season === topSeason)
  const isCup = (r: { leagueApiId: number }) => CUP_LEAGUE_API_IDS.has(r.leagueApiId)
  const isSecondary = (r: { leagueApiId: number }) => SECONDARY_CLUB_LEAGUES.has(r.leagueApiId)
  const currentClub =
    seasonRows.find((r) => !isCup(r) && !isSecondary(r)) ??
    seasonRows.find((r) => !isCup(r)) ??
    seasonRows[0] ??
    head
  return {
    playerApiId: head.playerApiId,
    name: head.name,
    firstname: head.firstname,
    lastname: head.lastname,
    // Age from birth date is always current; fall back to the API's stored age.
    age: ageFromBirthDate(birthDate) ?? head.age,
    nationality: head.nationality,
    position: head.position,
    height: rows.find((r) => r.height)?.height ?? head.height,
    weight: rows.find((r) => r.weight)?.weight ?? head.weight,
    birthDate,
    birthPlace: rows.find((r) => r.birthPlace)?.birthPlace ?? null,
    photoUrl: head.photoUrl,
    currentTeamId: currentClub.teamId,
    currentTeamApiId: currentClub.teamApiId,
    currentTeamName: currentClub.teamName,
    currentTeamSeason: currentClub.season,
    seasons: rows.map((r) => ({
      leagueId: r.leagueId,
      leagueName: r.leagueName,
      leagueApiId: r.leagueApiId,
      season: r.season,
      teamId: r.teamId,
      teamApiId: r.teamApiId,
      teamName: r.teamName,
      appearances: r.appearances,
      minutes: r.minutes,
      goals: r.goals,
      assists: r.assists,
      yellowCards: r.yellowCards,
      redCards: r.redCards,
      rating: r.rating,
      stats: r.stats,
    })),
  }
}

export interface SearchTeam {
  id: number
  apiFootballId: number
  name: string
}
export interface SearchPlayer {
  playerApiId: number
  name: string
  photoUrl: string | null
  teamName: string | null
  teamApiId: number | null
}

// Global search over team + player names for the header search bar.
export async function search(q: string): Promise<{ teams: SearchTeam[]; players: SearchPlayer[] }> {
  const like = `%${q}%`
  const prefix = `${q}%`
  // Accent-insensitive: normalise both stored name and query with unaccent().
  const teams = (
    await query<SearchTeam>(
      `SELECT id, api_football_id AS "apiFootballId", name
       FROM teams
       WHERE unaccent(name) ILIKE unaccent($1)
       ORDER BY (unaccent(name) ILIKE unaccent($2)) DESC, name
       LIMIT 8`,
      [like, prefix],
    )
  ).rows
  const wordStart = `% ${q}%`
  const players = (
    await query<SearchPlayer>(
      `SELECT "playerApiId", name, "photoUrl", "teamName", "teamApiId" FROM (
         SELECT DISTINCT ON (p.player_api_id)
           p.player_api_id AS "playerApiId", p.name, p.firstname, p.lastname, p.photo_url AS "photoUrl",
           p.team_name AS "teamName", p.team_api_id AS "teamApiId",
           -- Total career appearances rank prominence (the picked row's own are
           -- 0 for a current preseason squad, and a single peak season would let
           -- a journeyman outrank a superstar).
           (SELECT SUM(p2.appearances) FROM players p2 WHERE p2.player_api_id = p.player_api_id) AS appearances
         FROM players p JOIN leagues l ON l.id = p.league_id
         WHERE unaccent(p.name) ILIKE unaccent($1)
            OR unaccent(p.firstname) ILIKE unaccent($1)
            OR unaccent(p.lastname) ILIKE unaccent($1)
            OR unaccent(COALESCE(p.firstname, '') || ' ' || COALESCE(p.lastname, '')) ILIKE unaccent($1)
         -- Displayed team should be the current CLUB: national team (World Cup,
         -- api id 1) last; then newest season; then, within a season, a domestic
         -- league beats a continental cup (which can name a loan/former club);
         -- then most appearances.
         ORDER BY p.player_api_id, (l.api_football_id = 1) ASC, p.season DESC,
                  (l.api_football_id = ANY(ARRAY[2, 3, 848])) ASC, p.appearances DESC NULLS LAST
       ) s
       ORDER BY
         -- Tier 1: the term is the whole surname (name is exactly it, or ends
         -- with it as a word) — "messi" beats "Messias", "ronaldo" beats none.
         (unaccent(s.name) ILIKE unaccent($4) OR unaccent(s.name) ILIKE unaccent($5)) DESC,
         -- Tier 2: the term begins the name, a later word, or the surname field.
         (unaccent(s.name) ILIKE unaccent($2)
          OR unaccent(s.name) ILIKE unaccent($3)
          OR unaccent(COALESCE(s.lastname, '')) ILIKE unaccent($2)
          OR unaccent(s.firstname) ILIKE unaccent($2)) DESC,
         s.appearances DESC NULLS LAST, s.name
       LIMIT 8`,
      [like, prefix, wordStart, q, `% ${q}`],
    )
  ).rows
  return { teams, players }
}

export interface TeamStanding {
  leagueId: number
  leagueName: string
  leagueApiId: number
  season: number
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: string | null
}

// The team's standing rows across active competitions (domestic league, and a
// group/league-phase table for cups), newest season first.
export async function getTeamStandings(teamId: number): Promise<TeamStanding[]> {
  const { rows } = await query<TeamStanding>(
    `SELECT l.id AS "leagueId", l.name AS "leagueName", l.api_football_id AS "leagueApiId", l.season,
            s.position, s.played, s.won, s.drawn, s.lost, s.goals_for AS "goalsFor",
            s.goals_against AS "goalsAgainst", s.points, s.form
     FROM standings s JOIN leagues l ON l.id = s.league_id
     WHERE s.team_id = $1 AND l.is_active = true
     ORDER BY l.season DESC, s.position`,
    [teamId],
  )
  return rows
}

export interface SquadPlayer {
  playerApiId: number
  name: string
  position: string | null
  nationality: string | null
  age: number | null
  jerseyNumber: number | null
  goals: number | null
  assists: number | null
  appearances: number | null
  minutes: number | null
  rating: number | null
  photoUrl: string | null
  season: number
  // Career-peak appearances, so a current (preseason, stat-less) squad can still
  // be ranked by who the established players are.
  careerApps: number | null
}

// The team's CURRENT-season squad (its newest season we hold), best scorers
// first. Restricting to the latest season keeps players who have since left —
// picked up from historical backfills — out of the current roster.
export async function getTeamSquad(teamApiId: number): Promise<SquadPlayer[]> {
  const { rows } = await query<SquadPlayer>(
    `SELECT DISTINCT ON (pl.player_api_id)
       pl.player_api_id AS "playerApiId", pl.name, pl.position, pl.nationality, pl.age,
       pl.jersey_number AS "jerseyNumber", pl.goals, pl.assists, pl.appearances, pl.minutes,
       pl.rating::float8 AS rating, pl.photo_url AS "photoUrl", pl.season,
       (SELECT MAX(p2.appearances) FROM players p2 WHERE p2.player_api_id = pl.player_api_id) AS "careerApps"
     FROM players pl
     WHERE pl.team_api_id = $1
       AND pl.season = (SELECT MAX(season) FROM players WHERE team_api_id = $1)
     ORDER BY pl.player_api_id, pl.appearances DESC NULLS LAST`,
    [teamApiId],
  )
  return rows.sort(
    (a, b) => (b.goals ?? 0) - (a.goals ?? 0) || (b.appearances ?? 0) - (a.appearances ?? 0),
  )
}

export interface TeamSquadHistory {
  seasons: number[]
  season: number | null
  squad: SquadPlayer[]
}

// A team's squad for a chosen season, plus every season we hold for that team —
// so the detailed squad page can walk 10+ years of past rosters.
export async function getTeamSquadHistory(
  teamApiId: number,
  season?: number,
): Promise<TeamSquadHistory> {
  const seasons = (
    await query<{ season: number }>(
      `SELECT DISTINCT season FROM players WHERE team_api_id = $1 ORDER BY season DESC`,
      [teamApiId],
    )
  ).rows.map((r) => r.season)
  if (seasons.length === 0) return { seasons: [], season: null, squad: [] }
  const target = season != null && seasons.includes(season) ? season : seasons[0]
  const { rows } = await query<SquadPlayer>(
    `SELECT DISTINCT ON (pl.player_api_id)
       pl.player_api_id AS "playerApiId", pl.name, pl.position, pl.nationality, pl.age,
       pl.jersey_number AS "jerseyNumber", pl.goals, pl.assists, pl.appearances, pl.minutes,
       pl.rating::float8 AS rating, pl.photo_url AS "photoUrl", pl.season,
       (SELECT MAX(p2.appearances) FROM players p2 WHERE p2.player_api_id = pl.player_api_id) AS "careerApps"
     FROM players pl WHERE pl.team_api_id = $1 AND pl.season = $2
     ORDER BY pl.player_api_id, pl.appearances DESC NULLS LAST`,
    [teamApiId, target],
  )
  const squad = rows.sort(
    (a, b) => (b.goals ?? 0) - (a.goals ?? 0) || (b.appearances ?? 0) - (a.appearances ?? 0),
  )
  return { seasons, season: target, squad }
}

export async function getTeam(teamId: number) {
  const { rows } = await query(
    `SELECT id, api_football_id AS "apiFootballId", name, short_name AS "shortName",
            stadium_name AS "stadiumName", city, founded, country,
            venue_capacity AS "venueCapacity", venue_image AS "venueImage"
     FROM teams WHERE id = $1`,
    [teamId],
  )
  return rows[0] ?? null
}

// A chronological window around now: the last few results plus the upcoming
// matches. Ordering purely by kickoff DESC would, for a not-yet-started season,
// return the season's FINAL matches and hide the fixtures about to be played.
export async function getTeamFixtures(teamId: number): Promise<FixtureDTO[]> {
  const recent = await query<FixtureRow>(
    `${FIXTURE_SELECT}
     WHERE (f.home_team_id = $1 OR f.away_team_id = $1) AND f.status IN ('FT','AET','PEN')
     ORDER BY f.kickoff_at DESC LIMIT 6`,
    [teamId],
  )
  const upcoming = await query<FixtureRow>(
    `${FIXTURE_SELECT}
     WHERE (f.home_team_id = $1 OR f.away_team_id = $1)
       AND f.status NOT IN ('FT','AET','PEN','CANC','ABD','AWD','WO','PST')
       AND f.kickoff_at >= now() - interval '3 hours'
     ORDER BY f.kickoff_at ASC LIMIT 18`,
    [teamId],
  )
  return [...recent.rows, ...upcoming.rows]
    .map(mapFixture)
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
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

// ---------------------------------------------------------------------------
// Player career — every club from the start of the career.
// ---------------------------------------------------------------------------

export interface PlayerCareer {
  synced: boolean // have we fetched this player's transfers yet?
  clubs: Array<{ teamApiId: number | null; teamName: string; since: string | null }>
}

export async function hasTransferSync(playerApiId: number): Promise<boolean> {
  const { rowCount } = await query(`SELECT 1 FROM player_transfer_sync WHERE player_api_id = $1`, [
    playerApiId,
  ])
  return (rowCount ?? 0) > 0
}

// Merge two sources into one chronological list of every club the player has been
// at: the transfer chain (reaches back furthest) and the season rows we already
// hold (covers the very latest club even before its transfer is recorded). Each
// club is kept once, positioned at its earliest appearance.
export async function getPlayerCareer(playerApiId: number): Promise<PlayerCareer> {
  const synced = await hasTransferSync(playerApiId)

  const tr = await query<{
    transferDate: string | null
    inId: number | null
    inName: string | null
    outId: number | null
    outName: string | null
  }>(
    `SELECT transfer_date AS "transferDate", in_team_api_id AS "inId", in_team_name AS "inName",
            out_team_api_id AS "outId", out_team_name AS "outName"
     FROM player_transfers WHERE player_api_id = $1
     ORDER BY transfer_date ASC NULLS FIRST, id ASC`,
    [playerApiId],
  )

  const seasons = await query<{ teamApiId: number | null; teamName: string | null; season: number }>(
    // Exclude national-team rows (World Cup, api 1) — those are not clubs.
    `SELECT p.team_api_id AS "teamApiId", p.team_name AS "teamName", MIN(p.season) AS season
     FROM players p JOIN leagues l ON l.id = p.league_id
     WHERE p.player_api_id = $1 AND p.team_name IS NOT NULL AND l.api_football_id <> 1
     GROUP BY p.team_api_id, p.team_name`,
    [playerApiId],
  )

  type Acc = { teamApiId: number | null; teamName: string; since: string | null; sort: number }
  const map = new Map<string, Acc>()
  const keyOf = (id: number | null, name: string) =>
    id != null ? `id:${id}` : `n:${name.toLowerCase()}`
  const consider = (id: number | null, name: string | null, since: string | null, sort: number) => {
    if (!name) return
    const k = keyOf(id, name)
    const existing = map.get(k)
    if (!existing || sort < existing.sort) {
      map.set(k, { teamApiId: id, teamName: name, since: since ?? existing?.since ?? null, sort })
    }
  }

  for (const r of tr.rows) {
    const dt = r.transferDate ? new Date(r.transferDate) : null
    const valid = dt && !Number.isNaN(dt.getTime())
    const year = valid ? String(dt!.getFullYear()) : null
    const t = valid ? dt!.getTime() : 0
    consider(r.outId, r.outName, year, t - 1) // club they left sorts just before the one they joined
    consider(r.inId, r.inName, year, t)
  }
  for (const s of seasons.rows) {
    const t = Date.UTC(Number(s.season), 6, 1) // ~July 1 of that season
    consider(s.teamApiId, s.teamName, String(s.season), t)
  }

  const clubs = [...map.values()]
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({ teamApiId: c.teamApiId, teamName: c.teamName, since: c.since }))
  return { synced, clubs }
}
