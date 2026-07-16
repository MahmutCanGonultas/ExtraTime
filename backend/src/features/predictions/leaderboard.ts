import { query } from '../../db/pool'

// Season-scoped leaderboard, shared by the live standings endpoint, the
// champion computation on finish, and the history/season detail view. Kept free
// of group/auth imports so both groups.service and predictions.service can use
// it without a circular dependency.

export interface LeaderboardEntry {
  userId: number
  displayName: string
  points: number
  adjustment: number
  exactCount: number
  settledCount: number
  totalPredictions: number
  accuracy: number | null
  exactAccuracy: number | null
}

/**
 * Standings for one season: every member with their points over that season's
 * curated fixtures. A null seasonId (a group between games) yields every member
 * on zero. Ordered best-first — row 0 is the (provisional) champion.
 */
export async function seasonLeaderboard(
  groupId: number,
  seasonId: number | null,
): Promise<LeaderboardEntry[]> {
  const { rows } = await query<{
    userId: number
    displayName: string
    points: number
    exactCount: number
    scoringCount: number
    wrongCount: number
    settledCount: number
    totalPredictions: number
  }>(
    `SELECT u.id AS "userId", u.display_name AS "displayName",
            COALESCE(SUM(p.points_awarded), 0)::int AS points,
            COALESCE(SUM(CASE WHEN p.points_awarded >= 5 THEN 1 ELSE 0 END), 0)::int AS "exactCount",
            COALESCE(SUM(CASE WHEN p.points_awarded > 0 THEN 1 ELSE 0 END), 0)::int AS "scoringCount",
            COALESCE(SUM(CASE WHEN p.settled_at IS NOT NULL AND p.points_awarded = 0 THEN 1 ELSE 0 END), 0)::int AS "wrongCount",
            COALESCE(SUM(CASE WHEN p.settled_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS "settledCount",
            COUNT(p.id)::int AS "totalPredictions"
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN predictions p ON p.group_id = gm.group_id AND p.user_id = gm.user_id
       AND p.fixture_id IN (SELECT fixture_id FROM group_fixtures WHERE season_id = $2)
     WHERE gm.group_id = $1
     GROUP BY u.id, u.display_name
     ORDER BY points DESC, "exactCount" DESC, u.display_name ASC`,
    [groupId, seasonId],
  )

  // Manual admin point adjustments for this season, summed per member.
  const adjustments = new Map<number, number>()
  if (seasonId !== null) {
    const adj = await query<{ userId: number; delta: number }>(
      `SELECT user_id AS "userId", COALESCE(SUM(delta), 0)::int AS delta
       FROM point_adjustments WHERE season_id = $1 GROUP BY user_id`,
      [seasonId],
    )
    for (const a of adj.rows) adjustments.set(a.userId, a.delta)
  }

  const wrong = new Map(rows.map((r) => [r.userId, r.wrongCount]))
  const entries = rows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    points: r.points + (adjustments.get(r.userId) ?? 0),
    adjustment: adjustments.get(r.userId) ?? 0,
    exactCount: r.exactCount,
    settledCount: r.settledCount,
    totalPredictions: r.totalPredictions,
    // Share of settled predictions that scored anything.
    accuracy: r.settledCount > 0 ? r.scoringCount / r.settledCount : null,
    // Share of settled predictions that nailed the exact score.
    exactAccuracy: r.settledCount > 0 ? r.exactCount / r.settledCount : null,
  }))

  // Re-rank in JS: points, then exact-score count, then fewest wrong, then name.
  // (Manual adjustments can change the order, so we sort here not in SQL.)
  entries.sort(
    (a, b) =>
      b.points - a.points ||
      b.exactCount - a.exactCount ||
      (wrong.get(a.userId) ?? 0) - (wrong.get(b.userId) ?? 0) ||
      a.displayName.localeCompare(b.displayName, 'tr'),
  )
  return entries
}
