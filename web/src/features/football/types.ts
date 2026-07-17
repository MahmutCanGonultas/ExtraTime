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

export interface MatchEvent {
  teamApiId: number | null
  minute: number | null
  extraMinute: number | null
  type: string
  detail: string | null
  playerName: string | null
  assistName: string | null
}

export interface MatchStat {
  teamApiId: number
  type: string
  value: string | null
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
  founded: number | null
  country: string | null
  venueCapacity: number | null
  venueImage: string | null
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

export interface SearchResults {
  teams: SearchTeam[]
  players: SearchPlayer[]
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
}

export interface TeamDetail {
  team: Team
  fixtures: Fixture[]
  standings: TeamStanding[]
  squad: SquadPlayer[]
}

export interface TeamSquadHistory {
  team: Team
  seasons: number[]
  season: number | null
  squad: SquadPlayer[]
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

export interface PlayerStatBlock {
  shots?: { total: number | null; on: number | null }
  passes?: { total: number | null; key: number | null; accuracy: number | null }
  tackles?: { total: number | null; blocks: number | null; interceptions: number | null }
  duels?: { total: number | null; won: number | null }
  dribbles?: { attempts: number | null; success: number | null }
  fouls?: { drawn: number | null; committed: number | null }
  penalty?: { won: number | null; scored: number | null; missed: number | null; saved: number | null }
  games?: { lineups: number | null; rating: string | null; captain?: boolean }
  [key: string]: unknown
}

export interface PlayerSeason {
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
  stats: PlayerStatBlock | null
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
  currentTeamId: number | null
  currentTeamApiId: number | null
  currentTeamName: string | null
  currentTeamSeason: number | null
  seasons: PlayerSeason[]
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
