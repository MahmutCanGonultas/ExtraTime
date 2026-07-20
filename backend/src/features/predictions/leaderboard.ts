import { query } from '../../db/pool'
import { calculatePoints, type MatchOutcome } from './scoring'

// Season-scoped leaderboard, shared by the live standings endpoint, the
// champion computation on finish, and the history/season detail view. Kept free
// of group/auth imports so both groups.service and predictions.service can use
// it without a circular dependency.

export interface LeaderboardEntry {
  userId: number
  displayName: string
  avatar: string | null
  points: number
  adjustment: number
  exactCount: number
  wrongCount: number
  settledCount: number
  totalPredictions: number
  accuracy: number | null
  exactAccuracy: number | null
}

// The SINGLE ranking rule, used by the season, weekly and live/provisional tables so
// all three break ties identically: most points, then most exact scores, then fewest
// wrong, then name (Turkish collation).
export function compareStandings(
  a: { points: number; exactCount: number; wrongCount: number; displayName: string },
  b: { points: number; exactCount: number; wrongCount: number; displayName: string },
): number {
  return (
    b.points - a.points ||
    b.exactCount - a.exactCount ||
    a.wrongCount - b.wrongCount ||
    a.displayName.localeCompare(b.displayName, 'tr')
  )
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
    avatar: string | null
    points: number
    exactCount: number
    scoringCount: number
    wrongCount: number
    settledCount: number
    totalPredictions: number
  }>(
    `SELECT u.id AS "userId", u.display_name AS "displayName", u.avatar,
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
     GROUP BY u.id, u.display_name, u.avatar
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

  const entries = rows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    avatar: r.avatar,
    points: r.points + (adjustments.get(r.userId) ?? 0),
    adjustment: adjustments.get(r.userId) ?? 0,
    exactCount: r.exactCount,
    wrongCount: r.wrongCount,
    settledCount: r.settledCount,
    totalPredictions: r.totalPredictions,
    // Share of settled predictions that scored anything.
    accuracy: r.settledCount > 0 ? r.scoringCount / r.settledCount : null,
    // Share of settled predictions that nailed the exact score.
    exactAccuracy: r.settledCount > 0 ? r.exactCount / r.settledCount : null,
  }))

  // Re-rank in JS (manual adjustments can change the order, so not in SQL).
  entries.sort(compareStandings)
  return entries
}

export interface WeekStanding {
  userId: number
  displayName: string
  avatar: string | null
  points: number
  exactCount: number
  wrongCount: number
}

export interface GameWeek {
  roundKey: string // the week's Monday date, "YYYY-MM-DD" (Istanbul calendar week)
  weekNo: number | null // chronological week index within the game (1, 2, 3, …)
  matchCount: number
  settledCount: number
  settled: boolean // every match of the week is final
  standings: WeekStanding[]
  champion: WeekStanding | null // crowned once the week is settled
}

/**
 * Weekly breakdown of a game: fixtures are bucketed by their Istanbul CALENDAR
 * week (Monday 00:00 – Sunday 23:59) — every match that week, whatever competition
 * or round, shares one weekly champion. Weeks are ordered by their earliest
 * kickoff and numbered chronologically. The OVERALL champion is still the season total.
 */
export async function seasonWeeks(groupId: number, seasonId: number | null): Promise<GameWeek[]> {
  if (seasonId === null) return []
  // Bucket by the Istanbul CALENDAR week (Monday 00:00 – Sunday 23:59): every match
  // played in the same week — whatever competition or round — shares one weekly
  // champion. The key is the week's Monday date.
  const WEEK = `to_char(date_trunc('week', f.kickoff_at AT TIME ZONE 'Europe/Istanbul'), 'YYYY-MM-DD')`

  const fixtures = await query<{
    roundKey: string
    matchCount: number
    settledCount: number
  }>(
    `SELECT ${WEEK} AS "roundKey",
            COUNT(*)::int AS "matchCount",
            COUNT(*) FILTER (WHERE f.status IN ('FT','AET','PEN'))::int AS "settledCount"
     FROM group_fixtures gf JOIN fixtures f ON f.id = gf.fixture_id
     WHERE gf.season_id = $1
     GROUP BY ${WEEK} ORDER BY MIN(f.kickoff_at)`,
    [seasonId],
  )

  const rows = await query<{
    roundKey: string
    userId: number
    displayName: string
    avatar: string | null
    points: number
    exactCount: number
    wrongCount: number
  }>(
    // The LEFT JOIN already keeps only settled predictions, so points_awarded = 0 is a
    // wrong (settled, zero-point) pick.
    `SELECT ${WEEK} AS "roundKey",
            u.id AS "userId", u.display_name AS "displayName", u.avatar,
            COALESCE(SUM(p.points_awarded), 0)::int AS points,
            COALESCE(SUM(CASE WHEN p.points_awarded >= 5 THEN 1 ELSE 0 END), 0)::int AS "exactCount",
            COALESCE(SUM(CASE WHEN p.points_awarded = 0 THEN 1 ELSE 0 END), 0)::int AS "wrongCount"
     FROM group_fixtures gf
     JOIN fixtures f ON f.id = gf.fixture_id
     JOIN group_members gm ON gm.group_id = gf.group_id
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN predictions p ON p.group_id = gf.group_id AND p.user_id = gm.user_id
       AND p.fixture_id = gf.fixture_id AND p.settled_at IS NOT NULL
     WHERE gf.season_id = $1 AND gf.group_id = $2
     GROUP BY ${WEEK}, u.id, u.display_name, u.avatar`,
    [seasonId, groupId],
  )

  const byRound = new Map<string, WeekStanding[]>()
  const roundIndex = new Map<string, number>()
  const weeks: GameWeek[] = fixtures.rows.map((f, i) => {
    roundIndex.set(f.roundKey, i)
    return {
      roundKey: f.roundKey, // the week's Monday date (YYYY-MM-DD)
      weekNo: i + 1, // chronological week index within the game
      matchCount: f.matchCount,
      settledCount: f.settledCount,
      settled: f.settledCount === f.matchCount && f.matchCount > 0,
      standings: [],
      champion: null,
    }
  })

  for (const r of rows.rows) {
    const idx = roundIndex.get(r.roundKey)
    if (idx == null) continue
    const list = byRound.get(r.roundKey) ?? []
    list.push({
      userId: r.userId,
      displayName: r.displayName,
      avatar: r.avatar,
      points: r.points,
      exactCount: r.exactCount,
      wrongCount: r.wrongCount,
    })
    byRound.set(r.roundKey, list)
  }

  for (const [key, list] of byRound) {
    const idx = roundIndex.get(key)
    if (idx == null) continue
    list.sort(compareStandings)
    weeks[idx].standings = list
    if (weeks[idx].settled && list.length > 0 && list[0].points > 0) {
      weeks[idx].champion = list[0]
    }
  }

  return weeks
}

const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'SUSP', 'INT']

export interface ProvisionalEntry extends LeaderboardEntry {
  livePoints: number
  direction: number // rank change vs the settled table (+ = moved up)
}

/**
 * "If the live scores froze now" leaderboard: settled points PLUS hypothetical
 * points from in-progress curated matches (scored with the same pure function as
 * settlement). Never persisted — this keeps "settle only on final".
 */
export async function provisionalLeaderboard(
  groupId: number,
  seasonId: number | null,
): Promise<{ entries: ProvisionalEntry[]; live: boolean }> {
  const base = await seasonLeaderboard(groupId, seasonId)
  const settledRank = new Map(base.map((e, i) => [e.userId, i + 1]))
  if (seasonId === null) {
    return { entries: base.map((e) => ({ ...e, livePoints: 0, direction: 0 })), live: false }
  }

  const live = await query<{
    user_id: number
    outcome: MatchOutcome
    ph: number | null
    pa: number | null
    hs: number
    as_: number
  }>(
    `SELECT p.user_id, p.predicted_outcome AS outcome, p.predicted_home AS ph, p.predicted_away AS pa,
            f.home_score AS hs, f.away_score AS as_
     FROM predictions p
     JOIN group_fixtures gf ON gf.group_id = p.group_id AND gf.fixture_id = p.fixture_id AND gf.season_id = $2
     JOIN fixtures f ON f.id = p.fixture_id
     WHERE p.group_id = $1 AND f.status = ANY($3) AND f.home_score IS NOT NULL AND f.away_score IS NOT NULL`,
    [groupId, seasonId, LIVE],
  )

  const liveByUser = new Map<number, number>()
  for (const r of live.rows) {
    const pts = calculatePoints(
      { outcome: r.outcome, home: r.ph, away: r.pa },
      { home: r.hs, away: r.as_ },
    )
    liveByUser.set(r.user_id, (liveByUser.get(r.user_id) ?? 0) + pts)
  }

  const entries = base
    .map((e) => {
      const livePoints = liveByUser.get(e.userId) ?? 0
      return { ...e, livePoints, points: e.points + livePoints, direction: 0 }
    })
    .sort(compareStandings)
    .map((e, i) => ({ ...e, direction: (settledRank.get(e.userId) ?? i + 1) - (i + 1) }))

  return { entries, live: live.rows.length > 0 }
}
