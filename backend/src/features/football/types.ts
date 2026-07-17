// Minimal shapes for the API-Football v3 responses we consume. Only the fields
// we actually store are modeled; the API returns much more.

export interface RawFixture {
  fixture: {
    id: number
    date: string // ISO 8601 with timezone
    status: { long: string; short: string; elapsed: number | null }
    venue: { name: string | null; city: string | null }
  }
  league: { id: number; name: string; country: string; season: number; round: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}

export interface RawStandingRow {
  rank: number
  team: { id: number; name: string }
  points: number
  goalsDiff: number
  group: string | null
  description: string | null
  form: string | null
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}

export interface RawStandingsLeague {
  league: {
    id: number
    name: string
    country: string
    season: number
    // API nests standings as an array of groups (usually one group per league).
    standings: RawStandingRow[][]
  }
}

export interface RawTopScorer {
  player: { id: number; name: string }
  statistics: Array<{
    team: { id: number; name: string }
    games: { appearences: number | null }
    goals: { total: number | null; assists: number | null }
    penalty: { scored: number | null }
  }>
}

export interface RawLeague {
  league: { id: number; name: string; type: string }
  country: { name: string }
  seasons: Array<{ year: number; current: boolean }>
}

export interface RawTeamInfo {
  team: { id: number; name: string; country: string | null; founded: number | null; logo: string | null }
  venue: {
    id: number | null
    name: string | null
    city: string | null
    capacity: number | null
    image: string | null
  } | null
}

export interface RawPlayer {
  player: {
    id: number
    name: string
    firstname: string | null
    lastname: string | null
    age: number | null
    birth: { date: string | null; place: string | null; country: string | null } | null
    nationality: string | null
    height: string | null
    weight: string | null
    photo: string | null
  }
  statistics: Array<{
    team: { id: number; name: string | null }
    league: { id: number; season: number | null }
    games: {
      appearences: number | null
      minutes: number | null
      position: string | null
      rating: string | null
    }
    goals: { total: number | null; assists: number | null }
    cards: { yellow: number | null; red: number | null }
  }>
}

// players/squads response: the CURRENT squad of a team (works in preseason too,
// unlike season-stat endpoints), each member with shirt number, position and
// age. Used to seed current-season (2026-27) player rows so the guess game and
// team pages reflect where a player actually plays now.
export interface RawSquad {
  team: { id: number; name: string | null }
  players: Array<{
    id: number
    name: string | null
    age: number | null
    number: number | null
    position: string | null
    photo: string | null
  }>
}

// A single in-match event (goal, card, substitution).
export interface RawFixtureEvent {
  time: { elapsed: number | null; extra: number | null }
  team: { id: number; name: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string // 'Normal Goal' | 'Penalty' | 'Own Goal' | 'Missed Penalty' ...
}

// One team's statistics line for a fixture (possession, shots, ...).
export interface RawFixtureStatistic {
  team: { id: number; name: string | null }
  statistics: Array<{ type: string; value: number | string | null }>
}
