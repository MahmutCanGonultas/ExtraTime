import { query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { isMember } from '../groups/groups.service'
import { isLocked } from './lock'

export interface SavedPrediction {
  id: number
  predictedHome: number
  predictedAway: number
}

/**
 * Create or update a prediction. The lock is enforced HERE, on the server,
 * inside the SQL: the row is only written if the fixture is still scheduled and
 * kicks off in the future, compared against the database's own clock. The client
 * clock is never trusted; a disabled button on the frontend is UX only.
 */
export async function upsertPrediction(
  userId: number,
  groupId: number,
  fixtureId: number,
  predictedHome: number,
  predictedAway: number,
): Promise<SavedPrediction> {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }

  // Authoritative lock: ask the database, using ITS clock, whether the fixture
  // is still open. The client clock is never involved.
  const gate = await query<{ open: boolean }>(
    `SELECT (status = 'NS' AND kickoff_at > now()) AS open FROM fixtures WHERE id = $1`,
    [fixtureId],
  )
  const fixture = gate.rows[0]
  if (!fixture) throw AppError.notFound('Fixture not found')
  if (!fixture.open) {
    throw AppError.locked('This match is locked; predictions can no longer be entered or changed')
  }

  const { rows } = await query<SavedPrediction>(
    `INSERT INTO predictions (user_id, group_id, fixture_id, predicted_home, predicted_away)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, group_id, fixture_id) DO UPDATE
       SET predicted_home = EXCLUDED.predicted_home,
           predicted_away = EXCLUDED.predicted_away,
           updated_at = now()
     RETURNING id, predicted_home AS "predictedHome", predicted_away AS "predictedAway"`,
    [userId, groupId, fixtureId, predictedHome, predictedAway],
  )
  return rows[0]
}

export async function getMyPredictions(groupId: number, userId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows } = await query(
    `SELECT p.fixture_id AS "fixtureId", p.predicted_home AS "predictedHome",
            p.predicted_away AS "predictedAway", p.points_awarded AS "pointsAwarded",
            p.settled_at AS "settledAt", f.kickoff_at AS "kickoffAt", f.status,
            f.home_score AS "homeScore", f.away_score AS "awayScore",
            ht.name AS "homeName", ht.api_football_id AS "homeApiId",
            at.name AS "awayName", at.api_football_id AS "awayApiId"
     FROM predictions p
     JOIN fixtures f ON f.id = p.fixture_id
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     WHERE p.group_id = $1 AND p.user_id = $2
     ORDER BY f.kickoff_at DESC`,
    [groupId, userId],
  )
  return rows
}

/**
 * Predictions of every member for one fixture. Privacy rule: before the match
 * locks (kickoff in the future), a member sees only their own prediction; after
 * lock, everyone's is visible. This check is on the server — hiding data only in
 * the UI would not be privacy.
 */
export async function getFixturePredictions(groupId: number, fixtureId: number, requesterId: number) {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const fixtureRes = await query<{ kickoff_at: Date }>(
    `SELECT kickoff_at FROM fixtures WHERE id = $1`,
    [fixtureId],
  )
  const fixture = fixtureRes.rows[0]
  if (!fixture) throw AppError.notFound('Fixture not found')

  const locked = isLocked(fixture.kickoff_at, new Date())
  const { rows } = await query<{
    userId: number
    displayName: string
    predictedHome: number
    predictedAway: number
    pointsAwarded: number | null
  }>(
    `SELECT p.user_id AS "userId", u.display_name AS "displayName",
            p.predicted_home AS "predictedHome", p.predicted_away AS "predictedAway",
            p.points_awarded AS "pointsAwarded"
     FROM predictions p JOIN users u ON u.id = p.user_id
     WHERE p.group_id = $1 AND p.fixture_id = $2
     ORDER BY u.display_name`,
    [groupId, fixtureId],
  )

  const predictions = locked ? rows : rows.filter((r) => r.userId === requesterId)
  return { locked, predictions }
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

export async function getLeaderboard(groupId: number, requesterId: number): Promise<LeaderboardEntry[]> {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows } = await query<{
    userId: number
    displayName: string
    points: number
    exactCount: number
    scoringCount: number
    settledCount: number
    totalPredictions: number
  }>(
    `SELECT u.id AS "userId", u.display_name AS "displayName",
            COALESCE(SUM(p.points_awarded), 0)::int AS points,
            COALESCE(SUM(CASE WHEN p.points_awarded = 3 THEN 1 ELSE 0 END), 0)::int AS "exactCount",
            COALESCE(SUM(CASE WHEN p.points_awarded > 0 THEN 1 ELSE 0 END), 0)::int AS "scoringCount",
            COALESCE(SUM(CASE WHEN p.settled_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS "settledCount",
            COUNT(p.id)::int AS "totalPredictions"
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN predictions p ON p.user_id = gm.user_id AND p.group_id = gm.group_id
     WHERE gm.group_id = $1
     GROUP BY u.id, u.display_name
     ORDER BY points DESC, "exactCount" DESC, u.display_name ASC`,
    [groupId],
  )

  return rows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    points: r.points,
    exactCount: r.exactCount,
    settledCount: r.settledCount,
    totalPredictions: r.totalPredictions,
    // "İsabet oranı": share of settled predictions that scored (3 or 1 points).
    accuracy: r.settledCount > 0 ? r.scoringCount / r.settledCount : null,
    // "Tam isabet oranı": share of settled predictions that were exact.
    exactAccuracy: r.settledCount > 0 ? r.exactCount / r.settledCount : null,
  }))
}

// Settled predictions over time, for the points-trend chart. The client turns
// this into a cumulative line per member.
export async function getGroupStats(groupId: number, requesterId: number) {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows } = await query(
    `SELECT p.user_id AS "userId", u.display_name AS "displayName",
            f.kickoff_at AS "kickoffAt", p.points_awarded AS "points"
     FROM predictions p
     JOIN users u ON u.id = p.user_id
     JOIN fixtures f ON f.id = p.fixture_id
     WHERE p.group_id = $1 AND p.settled_at IS NOT NULL
     ORDER BY f.kickoff_at ASC`,
    [groupId],
  )
  return { settled: rows }
}
