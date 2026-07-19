import { query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { getCurrentSeasonId, isMember } from '../groups/groups.service'
import { provisionalLeaderboard, seasonLeaderboard, type LeaderboardEntry } from './leaderboard'
import { outcomeOf, type MatchOutcome } from './scoring'
import { settleFixture } from './settle'

export interface SavedPrediction {
  id: number
  outcome: MatchOutcome
  predictedHome: number | null
  predictedAway: number | null
}

/**
 * Create or update a prediction. The primary pick is the OUTCOME (1X2); an exact
 * score is optional. Three server-side guards, all in the database:
 *   1) the fixture belongs to the group's CURRENT (active) game,
 *   2) the match is still open (status NS and kicks off in the future — the DB's
 *      own clock decides, never the client's),
 *   3) any score entered agrees with the chosen outcome.
 */
export async function upsertPrediction(
  userId: number,
  groupId: number,
  fixtureId: number,
  outcome: MatchOutcome,
  predictedHome: number | null,
  predictedAway: number | null,
): Promise<SavedPrediction> {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }

  const hasScore = predictedHome !== null && predictedAway !== null
  if (hasScore && outcomeOf({ home: predictedHome!, away: predictedAway! }) !== outcome) {
    throw AppError.badRequest('Girdiğin skor, seçtiğin sonuçla uyuşmuyor')
  }

  const gate = await query<{ in_game: boolean; open: boolean }>(
    `SELECT
       EXISTS (
         SELECT 1 FROM group_fixtures gf
         JOIN group_seasons gs ON gs.id = gf.season_id
         WHERE gf.group_id = $2 AND gf.fixture_id = $1 AND gs.status = 'active'
       ) AS in_game,
       (f.status = 'NS' AND f.kickoff_at > now()) AS open
     FROM fixtures f WHERE f.id = $1`,
    [fixtureId, groupId],
  )
  const g = gate.rows[0]
  if (!g) throw AppError.notFound('Fixture not found')
  if (!g.in_game) throw AppError.badRequest('Bu maç grubun güncel oyununda değil')
  if (!g.open) {
    throw AppError.locked('This match is locked; predictions can no longer be entered or changed')
  }

  // Predictions are FINAL: a member submits once and cannot change it afterwards.
  // ON CONFLICT DO NOTHING returns no row when one already exists.
  const { rows } = await query<SavedPrediction>(
    `INSERT INTO predictions (user_id, group_id, fixture_id, predicted_outcome, predicted_home, predicted_away)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, group_id, fixture_id) DO NOTHING
     RETURNING id, predicted_outcome AS "outcome",
               predicted_home AS "predictedHome", predicted_away AS "predictedAway"`,
    [userId, groupId, fixtureId, outcome, predictedHome, predictedAway],
  )
  if (!rows[0]) throw AppError.conflict('Tahminini zaten girdin; tahmin değiştirilemez')
  return rows[0]
}

/** Admin view: every member of a group and their prediction for one fixture. */
export async function adminFixturePredictions(groupId: number, fixtureId: number) {
  const { rows } = await query(
    `SELECT u.id AS "userId", u.display_name AS "displayName",
            p.predicted_outcome AS "predictedOutcome", p.predicted_home AS "predictedHome",
            p.predicted_away AS "predictedAway", p.points_awarded AS "pointsAwarded"
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN predictions p ON p.group_id = gm.group_id AND p.user_id = gm.user_id AND p.fixture_id = $2
     WHERE gm.group_id = $1
     ORDER BY u.display_name`,
    [groupId, fixtureId],
  )
  return rows
}

/**
 * Admin-only override: set (or change) ANY member's prediction for a match in the
 * group's game. Bypasses the one-shot/lock rules — the admin can correct things —
 * and re-settles the fixture if it has already finished so points stay right.
 */
export async function adminSetPrediction(
  groupId: number,
  targetUserId: number,
  fixtureId: number,
  outcome: MatchOutcome,
  predictedHome: number | null,
  predictedAway: number | null,
): Promise<void> {
  if (!(await isMember(groupId, targetUserId))) {
    throw AppError.badRequest('Bu kullanıcı grupta değil')
  }
  const hasScore = predictedHome !== null && predictedAway !== null
  if (hasScore && outcomeOf({ home: predictedHome!, away: predictedAway! }) !== outcome) {
    throw AppError.badRequest('Girilen skor seçilen sonuçla uyuşmuyor')
  }
  const gate = await query<{ in_game: boolean; final: boolean }>(
    `SELECT
       EXISTS (SELECT 1 FROM group_fixtures gf WHERE gf.group_id = $1 AND gf.fixture_id = $2) AS in_game,
       (f.status IN ('FT','AET','PEN')) AS final
     FROM fixtures f WHERE f.id = $2`,
    [groupId, fixtureId],
  )
  const g = gate.rows[0]
  if (!g) throw AppError.notFound('Fixture not found')
  if (!g.in_game) throw AppError.badRequest('Bu maç grubun oyununda değil')

  await query(
    `INSERT INTO predictions (user_id, group_id, fixture_id, predicted_outcome, predicted_home, predicted_away)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, group_id, fixture_id) DO UPDATE
       SET predicted_outcome = EXCLUDED.predicted_outcome,
           predicted_home = EXCLUDED.predicted_home,
           predicted_away = EXCLUDED.predicted_away,
           updated_at = now()`,
    [targetUserId, groupId, fixtureId, outcome, predictedHome, predictedAway],
  )
  if (g.final) await settleFixture(fixtureId)
}

export async function getMyPredictions(groupId: number, userId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const seasonId = await getCurrentSeasonId(groupId)
  if (seasonId === null) return []
  const { rows } = await query(
    `SELECT p.fixture_id AS "fixtureId", p.predicted_outcome AS "predictedOutcome",
            p.predicted_home AS "predictedHome", p.predicted_away AS "predictedAway",
            p.points_awarded AS "pointsAwarded",
            p.settled_at AS "settledAt", f.kickoff_at AS "kickoffAt", f.status,
            f.home_score AS "homeScore", f.away_score AS "awayScore",
            ht.name AS "homeName", ht.api_football_id AS "homeApiId",
            at.name AS "awayName", at.api_football_id AS "awayApiId"
     FROM predictions p
     JOIN fixtures f ON f.id = p.fixture_id
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     WHERE p.group_id = $1 AND p.user_id = $2
       AND p.fixture_id IN (SELECT fixture_id FROM group_fixtures WHERE season_id = $3)
     ORDER BY f.kickoff_at DESC`,
    [groupId, userId, seasonId],
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
  const fixtureRes = await query<{ locked: boolean }>(
    // Decide the reveal against DB time (not the app-server clock) so it matches
    // the write-lock gate exactly and can't be skewed open by clock drift.
    `SELECT (kickoff_at <= now()) AS locked FROM fixtures WHERE id = $1`,
    [fixtureId],
  )
  const fixture = fixtureRes.rows[0]
  if (!fixture) throw AppError.notFound('Fixture not found')

  const locked = fixture.locked
  const { rows } = await query<{
    userId: number
    displayName: string
    avatar: string | null
    predictedOutcome: MatchOutcome
    predictedHome: number | null
    predictedAway: number | null
    pointsAwarded: number | null
  }>(
    `SELECT p.user_id AS "userId", u.display_name AS "displayName", u.avatar,
            p.predicted_outcome AS "predictedOutcome",
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

// A single point-changing event in a game's history: either a settled prediction
// (the member earned it off a match) or an admin adjustment (the admin gave it).
export interface PointEvent {
  type: 'prediction' | 'adjustment'
  at: string
  userId: number
  displayName: string
  avatar: string | null
  points: number
  // prediction only
  fixtureId?: number
  homeName?: string
  awayName?: string
  homeScore?: number | null
  awayScore?: number | null
  predictedOutcome?: MatchOutcome
  predictedHome?: number | null
  predictedAway?: number | null
  // adjustment only
  reason?: string | null
  byName?: string | null
}

/** Full point history for a game: every settled prediction + every admin
 *  adjustment, newest first, so a member can see exactly who got which points and
 *  whether they earned them or the admin gave them. */
export async function getPointsHistory(
  groupId: number,
  requesterId: number,
  seasonId: number,
): Promise<PointEvent[]> {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const preds = await query<{
    at: Date
    userId: number
    displayName: string
    avatar: string | null
    points: number
    fixtureId: number
    homeName: string
    awayName: string
    homeScore: number | null
    awayScore: number | null
    predictedOutcome: MatchOutcome
    predictedHome: number | null
    predictedAway: number | null
  }>(
    `SELECT p.settled_at AS at, p.user_id AS "userId", u.display_name AS "displayName", u.avatar,
            p.points_awarded AS points, f.id AS "fixtureId",
            ht.name AS "homeName", at.name AS "awayName",
            f.home_score AS "homeScore", f.away_score AS "awayScore",
            p.predicted_outcome AS "predictedOutcome",
            p.predicted_home AS "predictedHome", p.predicted_away AS "predictedAway"
     FROM predictions p
     JOIN group_fixtures gf ON gf.fixture_id = p.fixture_id AND gf.group_id = p.group_id
     JOIN users u ON u.id = p.user_id
     JOIN fixtures f ON f.id = p.fixture_id
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     WHERE p.group_id = $1 AND gf.season_id = $2 AND p.settled_at IS NOT NULL
     ORDER BY p.settled_at DESC`,
    [groupId, seasonId],
  )
  const adjs = await query<{
    at: Date
    userId: number
    displayName: string
    avatar: string | null
    points: number
    reason: string | null
    byName: string | null
  }>(
    `SELECT pa.created_at AS at, pa.user_id AS "userId", u.display_name AS "displayName", u.avatar,
            pa.delta AS points, pa.reason, b.display_name AS "byName"
     FROM point_adjustments pa
     JOIN users u ON u.id = pa.user_id
     LEFT JOIN users b ON b.id = pa.created_by
     WHERE pa.group_id = $1 AND pa.season_id = $2
     ORDER BY pa.created_at DESC`,
    [groupId, seasonId],
  )
  const events: PointEvent[] = [
    ...preds.rows.map((r) => ({ ...r, type: 'prediction' as const, at: r.at.toISOString() })),
    ...adjs.rows.map((r) => ({ ...r, type: 'adjustment' as const, at: r.at.toISOString() })),
  ]
  events.sort((a, b) => (a.at < b.at ? 1 : -1))
  return events
}

export type { LeaderboardEntry } from './leaderboard'

/** Standings for the group's current game (active season, or the last finished
 *  one between games). Pass an explicit seasonId to read a historical game. */
export async function getLeaderboard(
  groupId: number,
  requesterId: number,
  seasonId?: number,
): Promise<LeaderboardEntry[]> {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const target = seasonId ?? (await getCurrentSeasonId(groupId))
  return seasonLeaderboard(groupId, target)
}

/** "If live scores froze now" standings for one game. */
export async function getProvisionalLeaderboard(
  groupId: number,
  requesterId: number,
  gameId: number,
) {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  return provisionalLeaderboard(groupId, gameId)
}

// Settled predictions over time, for the points-trend chart. The client turns
// this into a cumulative line per member. Scoped to the current game.
export async function getGroupStats(groupId: number, requesterId: number) {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const seasonId = await getCurrentSeasonId(groupId)
  if (seasonId === null) return { settled: [] }
  const { rows } = await query(
    `SELECT p.user_id AS "userId", u.display_name AS "displayName",
            f.kickoff_at AS "kickoffAt", p.points_awarded AS "points"
     FROM predictions p
     JOIN users u ON u.id = p.user_id
     JOIN fixtures f ON f.id = p.fixture_id
     WHERE p.group_id = $1 AND p.settled_at IS NOT NULL
       AND p.fixture_id IN (SELECT fixture_id FROM group_fixtures WHERE season_id = $2)
     ORDER BY f.kickoff_at ASC`,
    [groupId, seasonId],
  )
  return { settled: rows }
}
