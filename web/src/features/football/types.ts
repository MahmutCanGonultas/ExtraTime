export interface League {
  id: number
  apiFootballId: number
  name: string
  country: string | null
  season: number
  logoUrl: string | null
  isActive: boolean
}

export interface TeamRef {
  id: number
  apiFootballId: number
  name: string
}

export interface Fixture {
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

export interface StandingRow {
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: string | null
  teamId: number
  teamApiId: number
  teamName: string
}

export interface TopScorer {
  rank: number
  playerName: string
  goals: number
  penalties: number | null
  appearances: number | null
  teamId: number | null
  teamApiId: number | null
  teamName: string | null
}

export interface TopAssist {
  rank: number
  playerName: string
  assists: number
  appearances: number | null
  teamId: number | null
  teamApiId: number | null
  teamName: string | null
}

export interface Team {
  id: number
  apiFootballId: number
  name: string
  shortName: string | null
  stadiumName: string | null
  city: string | null
}
