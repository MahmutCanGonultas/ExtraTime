export interface GroupSummary {
  id: number
  name: string
  isAdmin: boolean
  memberCount: number
}

export interface GroupMember {
  id: number
  displayName: string
  joinedAt: string
}

export interface GroupDetail {
  id: number
  name: string
  adminUserId: number
  isAdmin: boolean
  inviteCode?: string
  members: GroupMember[]
}

export interface LeaderboardEntry {
  userId: number
  displayName: string
  points: number
  exactCount: number
  settledCount: number
  totalPredictions: number
  accuracy: number | null
  exactAccuracy: number | null
}

export interface MyPrediction {
  fixtureId: number
  predictedHome: number
  predictedAway: number
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
  predictedHome: number
  predictedAway: number
  pointsAwarded: number | null
}

export interface FixturePredictions {
  locked: boolean
  predictions: MemberPrediction[]
}
