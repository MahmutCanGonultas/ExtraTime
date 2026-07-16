export interface League {
  id: number
  apiFootballId: number
  name: string
  country: string | null
  season: number
  logoUrl: string | null
  isActive: boolean
  // The one season per competition to feature now (live/soonest/newest).
  isCurrent: boolean
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
  elapsed: number | null
  leagueName: string
  leagueApiId: number
  home: TeamRef
  away: TeamRef
  homeScore: number | null
  awayScore: number | null
  halftimeHome: number | null
  halftimeAway: number | null
  goals?: FixtureGoal[]
}

export interface FixtureGoal {
  teamApiId: number
  playerName: string
  assistName: string | null
  minute: number | null
  detail: string | null
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
  groupLabel: string | null
  description: string | null
  teamId: number
  teamApiId: number
  teamName: string
}

export interface TopScorer {
  rank: number
  playerName: string
  playerApiId: number | null
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
  playerApiId: number | null
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

export interface BracketTeam {
  teamId: number
  apiId: number
  name: string
}

export interface BracketMatch {
  key: string
  fixtureIds: number[]
  legs: number
  state: 'finished' | 'live' | 'scheduled'
  kickoffAt: string
  home: BracketTeam | null
  away: BracketTeam | null
  homeScore: number | null
  awayScore: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  winner: 'home' | 'away' | null
  sourceKeys: string[]
}

export interface BracketRound {
  key: string
  label: string
  order: number
  matches: BracketMatch[]
}

export interface Bracket {
  hasKnockout: boolean
  twoLegged: boolean
  rounds: BracketRound[]
  thirdPlace: BracketMatch | null
  champion: BracketTeam | null
}
