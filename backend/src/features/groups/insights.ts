import { query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { isMember } from './groups.service'

// Head-to-head record of the requester against every other member: over matches
// both predicted and that have settled, who scored more points. Pure SQL over the
// predictions we already store, across all of the group's games.
export async function getRivalries(groupId: number, userId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows } = await query(
    `SELECT other.user_id AS "userId", u.display_name AS "displayName",
            COUNT(*) FILTER (WHERE me.points_awarded > other.points_awarded)::int AS wins,
            COUNT(*) FILTER (WHERE me.points_awarded = other.points_awarded)::int AS draws,
            COUNT(*) FILTER (WHERE me.points_awarded < other.points_awarded)::int AS losses,
            COUNT(*)::int AS games
     FROM predictions me
     JOIN predictions other
       ON other.group_id = me.group_id AND other.fixture_id = me.fixture_id
      AND other.user_id <> me.user_id
     JOIN users u ON u.id = other.user_id
     WHERE me.group_id = $1 AND me.user_id = $2
       AND me.settled_at IS NOT NULL AND other.settled_at IS NOT NULL
     GROUP BY other.user_id, u.display_name
     ORDER BY games DESC, "displayName"`,
    [groupId, userId],
  )
  return rows
}

// A member's "trophy cabinet": championships won, jokers that paid off, and how
// many exact scores they've nailed. All from data we already keep.
export async function getMemberTrophies(groupId: number, userId: number, requesterId: number) {
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  // The TARGET must also belong to the group — otherwise the display-name lookup
  // below would disclose any platform user's name to any member (IDOR / enumeration).
  if (!(await isMember(groupId, userId))) {
    throw AppError.notFound('That user is not a member of this group')
  }
  const champs = await query(
    `SELECT title, champion_points AS "points", finished_at AS "finishedAt"
     FROM group_seasons
     WHERE group_id = $1 AND champion_user_id = $2 AND status = 'finished'
     ORDER BY finished_at DESC NULLS LAST`,
    [groupId, userId],
  )
  const jokers = await query<{ c: number }>(
    `SELECT COUNT(*)::int c
     FROM season_jokers sj
     JOIN group_seasons gs ON gs.id = sj.season_id AND gs.group_id = $1
     JOIN predictions p ON p.user_id = sj.user_id AND p.fixture_id = sj.fixture_id AND p.group_id = $1
     WHERE sj.user_id = $2 AND p.points_awarded IS NOT NULL AND p.points_awarded > 0`,
    [groupId, userId],
  )
  const exacts = await query<{ c: number }>(
    `SELECT COUNT(*)::int c FROM predictions
     WHERE group_id = $1 AND user_id = $2 AND points_awarded >= 5`,
    [groupId, userId],
  )
  const displayName = await query<{ display_name: string }>(
    `SELECT display_name FROM users WHERE id = $1`,
    [userId],
  )
  return {
    displayName: displayName.rows[0]?.display_name ?? '',
    championships: champs.rows,
    winningJokers: jokers.rows[0]?.c ?? 0,
    exactScores: exacts.rows[0]?.c ?? 0,
  }
}
