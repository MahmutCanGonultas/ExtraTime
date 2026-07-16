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

export interface RawPlayer {
  player: {
    id: number
    name: string
    firstname: string | null
    lastname: string | null
    age: number | null
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

// A single in-match event (goal, card, substitution). We only store goals.
export interface RawFixtureEvent {
  time: { elapsed: number | null; extra: number | null }
  team: { id: number; name: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string // 'Normal Goal' | 'Penalty' | 'Own Goal' | 'Missed Penalty' ...
}
