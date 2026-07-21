// Clubs ordered by rough global following — mirrors the backend search prominence,
// so the home page surfaces big-team matches the same way search surfaces big teams.
export const PROMINENT_TEAMS = [
  541, 529, 33, 157, 40, 50, 85, 496, 42, 49, 489, 505, 165, 530, 47, 492, 645, 611, 549,
  998, 536, 531, 532, 168, 169, 173, 487, 497, 499, 45, 34, 66, 80, 81, 91, 533, 543, 548,
  500, 502, 503,
]
const RANK = new Map<number, number>(PROMINENT_TEAMS.map((id, i) => [id, i]))

export function teamRank(apiId: number | null | undefined): number {
  return apiId != null && RANK.has(apiId) ? RANK.get(apiId)! : Number.POSITIVE_INFINITY
}

// A match's prominence = its more famous club's rank (lower = more prominent).
// Infinity means neither club is a big name.
export function matchProminence(homeApiId: number, awayApiId: number): number {
  return Math.min(teamRank(homeApiId), teamRank(awayApiId))
}
