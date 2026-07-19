export interface GroupSummary {
  id: number
  name: string
  isAdmin: boolean
  memberCount: number
}

export interface GroupMember {
  id: number
  displayName: string
  avatar: string | null
  joinedAt: string
}

export interface SeasonRef {
  id: number
  title: string
  status: 'active' | 'finished'
}

export interface GroupDetail {
  id: number
  name: string
  adminUserId: number
  isAdmin: boolean
  inviteCode?: string
  members: GroupMember[]
  activeSeason: SeasonRef | null
}

export type Outcome = 'HOME' | 'DRAW' | 'AWAY'

// A match in the group's current game, with the caller's own prediction.
export interface GameFixture {
  fixtureId: number
  fixtureApiId: number
  kickoffAt: string
  status: string
  round: string | null
  elapsed: number | null
  leagueName: string
  leagueApiId: number
  homeId: number
  homeApiId: number
  homeName: string
  awayId: number
  awayApiId: number
  awayName: string
  homeScore: number | null
  awayScore: number | null
  homeForm: string | null
  awayForm: string | null
  myOutcome: Outcome | null
  myHome: number | null
  myAway: number | null
  myPoints: number | null
  predictionCount: number
  open: boolean
}

export interface Champion {
  userId: number
  displayName: string
  points: number
}

export interface SeasonSummary {
  id: number
  title: string
  status: 'active' | 'finished'
  startedAt: string
  finishedAt: string | null
  championPoints: number | null
  championUserId: number | null
  championName: string | null
  matchCount: number
}

export interface WeekStanding {
  userId: number
  displayName: string
  avatar: string | null
  points: number
  exactCount: number
}

export interface GameWeek {
  roundKey: string
  weekNo: number | null
  matchCount: number
  settledCount: number
  settled: boolean
  standings: WeekStanding[]
  champion: WeekStanding | null
}

export interface SeasonDetail {
  season: SeasonSummary
  standings: LeaderboardEntry[]
  fixtures: GameFixture[]
  weeks: GameWeek[]
}

export interface Rivalry {
  userId: number
  displayName: string
  wins: number
  draws: number
  losses: number
  games: number
}

export interface Championship {
  title: string
  points: number | null
  finishedAt: string | null
}

export interface Trophies {
  displayName: string
  championships: Championship[]
  exactScores: number
}

export interface ProvisionalEntry extends LeaderboardEntry {
  livePoints: number
  direction: number
}

export interface LeaderboardEntry {
  userId: number
  displayName: string
  avatar: string | null
  points: number
  adjustment: number
  exactCount: number
  settledCount: number
  totalPredictions: number
  accuracy: number | null
  exactAccuracy: number | null
}

export interface MyPrediction {
  fixtureId: number
  predictedOutcome: Outcome
  predictedHome: number | null
  predictedAway: number | null
  pointsAwarded: number | null
  settledAt: string | null
  kickoffAt: string
  status: string
  homeScore: number | null
  awayScore: number | null
  homeName: string
  homeApiId: number
  awayName: string
  awayApiId: number
}

export interface MemberPrediction {
  userId: number
  displayName: string
  avatar: string | null
  predictedOutcome: Outcome
  predictedHome: number | null
  predictedAway: number | null
  pointsAwarded: number | null
}

// One point-changing event in a game's history: a settled prediction (earned) or
// an admin adjustment (given).
export interface PointEvent {
  type: 'prediction' | 'adjustment'
  at: string
  userId: number
  displayName: string
  avatar: string | null
  points: number
  fixtureId?: number
  homeName?: string
  awayName?: string
  homeScore?: number | null
  awayScore?: number | null
  predictedOutcome?: Outcome
  predictedHome?: number | null
  predictedAway?: number | null
  reason?: string | null
  byName?: string | null
}

export interface FixturePredictions {
  locked: boolean
  predictions: MemberPrediction[]
}

export interface SettledPoint {
  userId: number
  displayName: string
  kickoffAt: string
  points: number | null
}
