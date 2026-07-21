import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getPool, query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { isUniqueViolation } from '../../lib/pg-error'
import { CONFIGURED_LEAGUE_API_IDS } from '../football/leagues.config'
import { getGroupFixtures } from '../football/football.repository'
import { seasonLeaderboard, seasonWeeks } from '../predictions/leaderboard'

const SALT_ROUNDS = 10
// No ambiguous characters (0/O, 1/I) so codes are easy to read out loud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomFromAlphabet(length: number): string {
  const bytes = randomBytes(length)
  let out = ''
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return out
}

export interface GroupSummary {
  id: number
  name: string
  inviteCode: string
  adminUserId: number
}

export async function createGroup(name: string, adminUserId: number): Promise<GroupSummary> {
  // Retry on the rare invite-code collision (UNIQUE violation). All three inserts
  // run in ONE transaction so a mid-way failure can't leave an orphan group with no
  // members or season.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = randomFromAlphabet(8)
    const client = await getPool()!.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO groups (name, invite_code, admin_user_id) VALUES ($1, $2, $3) RETURNING id`,
        [name.trim(), inviteCode, adminUserId],
      )
      const groupId = rows[0].id
      await client.query(
        `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [groupId, adminUserId],
      )
      // Every group starts with an open first game the leader fills with matches.
      await client.query(`INSERT INTO group_seasons (group_id, title, status) VALUES ($1, $2, 'active')`, [
        groupId,
        '1. Oyun',
      ])
      await client.query('COMMIT')
      return { id: groupId, name: name.trim(), inviteCode, adminUserId }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      if (isUniqueViolation(err)) continue
      throw err
    } finally {
      client.release()
    }
  }
  throw new Error('Could not generate a unique invite code')
}

export async function joinGroup(inviteCode: string, userId: number): Promise<{ id: number; name: string }> {
  const { rows } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM groups WHERE invite_code = $1`,
    [inviteCode.trim().toUpperCase()],
  )
  const group = rows[0]
  if (!group) throw AppError.notFound('No group found for that invite code')
  await query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [group.id, userId],
  )
  return group
}

export async function getMyGroups(userId: number) {
  const { rows } = await query<{ id: number; name: string; isAdmin: boolean; memberCount: number }>(
    `SELECT g.id, g.name, (g.admin_user_id = $1) AS "isAdmin",
            (SELECT COUNT(*)::int FROM group_members m WHERE m.group_id = g.id) AS "memberCount"
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = $1
     ORDER BY g.created_at`,
    [userId],
  )
  return rows
}

export async function isMember(groupId: number, userId: number): Promise<boolean> {
  const { rowCount } = await query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId],
  )
  return (rowCount ?? 0) > 0
}

export async function getGroupDetail(groupId: number, requesterId: number) {
  const { rows } = await query<{ id: number; name: string; invite_code: string; admin_user_id: number }>(
    `SELECT id, name, invite_code, admin_user_id FROM groups WHERE id = $1`,
    [groupId],
  )
  const group = rows[0]
  if (!group) throw AppError.notFound('Group not found')
  if (!(await isMember(groupId, requesterId))) {
    throw AppError.forbidden('You are not a member of this group')
  }

  const members = await query<{
    id: number
    displayName: string
    avatar: string | null
    joinedAt: Date
  }>(
    `SELECT u.id, u.display_name AS "displayName", u.avatar, gm.joined_at AS "joinedAt"
     FROM group_members gm JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 ORDER BY gm.joined_at`,
    [groupId],
  )

  const activeSeason = await getActiveSeason(groupId)

  const isAdmin = group.admin_user_id === requesterId
  return {
    id: group.id,
    name: group.name,
    adminUserId: group.admin_user_id,
    isAdmin,
    // Only the admin sees the invite code.
    inviteCode: isAdmin ? group.invite_code : undefined,
    members: members.rows,
    activeSeason,
  }
}

// ---------------------------------------------------------------------------
// Seasons — a group runs one game (season) at a time; finished ones are history.
// ---------------------------------------------------------------------------

export interface SeasonRef {
  id: number
  title: string
  status: 'active' | 'finished'
}

/** The group's most recent open game, or null when it is between games. (A group
 *  can now run several games at once — this is just the newest active one.) */
export async function getActiveSeason(groupId: number): Promise<SeasonRef | null> {
  const { rows } = await query<SeasonRef>(
    `SELECT id, title, status FROM group_seasons
     WHERE group_id = $1 AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`,
    [groupId],
  )
  return rows[0] ?? null
}

/** Assert a game id belongs to the group and is still active — the gate for every
 *  admin write on a specific game. Returns nothing, throws if not. */
async function assertActiveGame(groupId: number, gameId: number): Promise<void> {
  const { rows } = await query<{ ok: boolean }>(
    `SELECT (status = 'active') AS ok FROM group_seasons WHERE id = $1 AND group_id = $2`,
    [gameId, groupId],
  )
  if (!rows[0]) throw AppError.notFound('Oyun bulunamadı')
  if (!rows[0].ok) throw AppError.badRequest('Bu oyun bitmiş')
}

/** The season whose standings we show "now": the open game, or, between games,
 *  the most recent finished one — so the final table stays on screen. */
export async function getCurrentSeasonId(groupId: number): Promise<number | null> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM group_seasons WHERE group_id = $1
     ORDER BY (status = 'active') DESC, started_at DESC LIMIT 1`,
    [groupId],
  )
  return rows[0]?.id ?? null
}

export async function regenerateInvite(groupId: number): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = randomFromAlphabet(8)
    try {
      await query(`UPDATE groups SET invite_code = $1 WHERE id = $2`, [inviteCode, groupId])
      return inviteCode
    } catch (err) {
      if (isUniqueViolation(err)) continue
      throw err
    }
  }
  throw new Error('Could not generate a unique invite code')
}

/** Remove a user from a group AND clean up everything keyed to their membership —
 *  predictions, point adjustments and jokers in that group — in one transaction, so
 *  no orphan picks keep inflating prediction counts or reappear if they rejoin. */
async function purgeMembership(groupId: number, userId: number): Promise<void> {
  const client = await getPool()!.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM predictions WHERE group_id = $1 AND user_id = $2`, [groupId, userId])
    await client.query(`DELETE FROM point_adjustments WHERE group_id = $1 AND user_id = $2`, [
      groupId,
      userId,
    ])
    await client.query(
      `DELETE FROM season_jokers WHERE user_id = $2
         AND season_id IN (SELECT id FROM group_seasons WHERE group_id = $1)`,
      [groupId, userId],
    )
    await client.query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [
      groupId,
      userId,
    ])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function removeMember(groupId: number, targetUserId: number, adminUserId: number): Promise<void> {
  if (targetUserId === adminUserId) {
    throw AppError.badRequest('The admin cannot be removed from the group')
  }
  await purgeMembership(groupId, targetUserId)
}

/** A member leaves the group on their own. The admin cannot leave (they must delete
 *  or hand over the group first). Cleans up their picks like removeMember does. */
export async function leaveGroup(groupId: number, userId: number): Promise<void> {
  const { rows } = await query<{ admin_user_id: number }>(
    `SELECT admin_user_id FROM groups WHERE id = $1`,
    [groupId],
  )
  if (!rows[0]) throw AppError.notFound('Group not found')
  if (rows[0].admin_user_id === userId) {
    throw AppError.badRequest('Grup başkanı gruptan ayrılamaz — önce grubu silmelisin')
  }
  if (!(await isMember(groupId, userId))) {
    throw AppError.notFound('You are not a member of this group')
  }
  await purgeMembership(groupId, userId)
}

/** Delete a whole group. ON DELETE CASCADE removes its members, seasons, curated
 *  fixtures, predictions, jokers and point adjustments. Admin-only (route gated). */
export async function deleteGroup(groupId: number): Promise<void> {
  await query(`DELETE FROM groups WHERE id = $1`, [groupId])
}

// ---------------------------------------------------------------------------
// The leader curates the season's matches; members predict only these.
// ---------------------------------------------------------------------------

const FIXTURE_FIELDS = `
  f.api_football_id AS "fixtureApiId", f.kickoff_at AS "kickoffAt", f.status,
  f.round, f.elapsed, f.home_score AS "homeScore", f.away_score AS "awayScore",
  lg.name AS "leagueName", lg.api_football_id AS "leagueApiId",
  ht.id AS "homeId", ht.api_football_id AS "homeApiId", ht.name AS "homeName",
  at.id AS "awayId", at.api_football_id AS "awayApiId", at.name AS "awayName"`

/** Add a fixture to a specific game. A match can belong to only ONE game per group
 *  (predictions are keyed by group+fixture). Admin-only (enforced by route). */
/** Append an admin action to the group's audit trail. Best-effort — a logging
 *  failure must never break the real action it records. */
async function logAudit(
  groupId: number,
  actorId: number | null,
  action: string,
  summary: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO group_audit_log (group_id, actor_user_id, action, summary) VALUES ($1, $2, $3, $4)`,
      [groupId, actorId, action, summary],
    )
  } catch {
    /* audit logging never breaks the action */
  }
}

async function matchLabel(fixtureId: number): Promise<string> {
  const { rows } = await query<{ home: string; away: string }>(
    `SELECT ht.name AS home, at.name AS away
     FROM fixtures f JOIN teams ht ON ht.id = f.home_team_id JOIN teams at ON at.id = f.away_team_id
     WHERE f.id = $1`,
    [fixtureId],
  )
  return rows[0] ? `${rows[0].home} - ${rows[0].away}` : `#${fixtureId}`
}

async function memberName(userId: number): Promise<string> {
  const { rows } = await query<{ name: string }>(
    `SELECT display_name AS name FROM users WHERE id = $1`,
    [userId],
  )
  return rows[0]?.name ?? `#${userId}`
}

export async function addGroupFixture(
  groupId: number,
  gameId: number,
  fixtureId: number,
  addedBy: number,
): Promise<void> {
  await assertActiveGame(groupId, gameId)
  const { rows } = await query<{ open: boolean; league_api: number }>(
    `SELECT (f.status = 'NS' AND f.kickoff_at > now()) AS open, lg.api_football_id AS league_api
     FROM fixtures f JOIN leagues lg ON lg.id = f.league_id WHERE f.id = $1`,
    [fixtureId],
  )
  const fixture = rows[0]
  if (!fixture) throw AppError.notFound('Maç bulunamadı')
  if (!CONFIGURED_LEAGUE_API_IDS.includes(fixture.league_api)) {
    throw AppError.badRequest('Bu lig oyuna eklenemez')
  }
  if (!fixture.open) throw AppError.badRequest('Başlamış ya da oynanmış bir maç eklenemez')
  const dup = await query(
    `SELECT 1 FROM group_fixtures WHERE group_id = $1 AND fixture_id = $2`,
    [groupId, fixtureId],
  )
  if ((dup.rowCount ?? 0) > 0) throw AppError.badRequest('Bu maç grubun bir oyununda zaten var')

  await query(
    `INSERT INTO group_fixtures (season_id, group_id, fixture_id, added_by)
     VALUES ($1, $2, $3, $4) ON CONFLICT (season_id, fixture_id) DO NOTHING`,
    [gameId, groupId, fixtureId, addedBy],
  )
  await logAudit(groupId, addedBy, 'fixture_add', `Maç eklendi: ${await matchLabel(fixtureId)}`)
}

/** Remove a fixture from a game, dropping any predictions on it. */
export async function removeGroupFixture(
  groupId: number,
  gameId: number,
  fixtureId: number,
  actorId: number,
): Promise<void> {
  await assertActiveGame(groupId, gameId)
  const label = await matchLabel(fixtureId)
  const client = await getPool()!.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM predictions WHERE group_id = $1 AND fixture_id = $2`, [
      groupId,
      fixtureId,
    ])
    await client.query(`DELETE FROM group_fixtures WHERE season_id = $1 AND fixture_id = $2`, [
      gameId,
      fixtureId,
    ])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
  await logAudit(groupId, actorId, 'fixture_remove', `Maç çıkarıldı: ${label}`)
}

/** The curated matches of a season, each with the given viewer's own prediction.
 *  No auth — callers gate access. */
async function seasonFixturesFor(groupId: number, seasonId: number, viewerId: number) {
  const { rows } = await query(
    `SELECT gf.fixture_id AS "fixtureId", ${FIXTURE_FIELDS},
            mp.predicted_outcome AS "myOutcome", mp.predicted_home AS "myHome",
            mp.predicted_away AS "myAway", mp.points_awarded AS "myPoints",
            sh.form AS "homeForm", sa.form AS "awayForm",
            (SELECT COUNT(*)::int FROM predictions p2
             WHERE p2.group_id = $1 AND p2.fixture_id = gf.fixture_id) AS "predictionCount",
            (f.status = 'NS' AND f.kickoff_at > now()) AS "open",
            (SELECT COALESCE(json_agg(json_build_object(
                'teamApiId', g.team_api_id, 'playerName', g.player_name, 'assistName', g.assist_name,
                'minute', g.minute, 'detail', g.detail) ORDER BY g.minute), '[]'::json)
             FROM fixture_goals g WHERE g.fixture_id = gf.fixture_id) AS goals
     FROM group_fixtures gf
     JOIN fixtures f ON f.id = gf.fixture_id
     JOIN leagues lg ON lg.id = f.league_id
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     LEFT JOIN predictions mp ON mp.group_id = $1 AND mp.fixture_id = gf.fixture_id AND mp.user_id = $3
     LEFT JOIN standings sh ON sh.league_id = f.league_id AND sh.team_id = f.home_team_id
     LEFT JOIN standings sa ON sa.league_id = f.league_id AND sa.team_id = f.away_team_id
     WHERE gf.season_id = $2
     ORDER BY f.kickoff_at ASC`,
    [groupId, seasonId, viewerId],
  )
  return rows
}

/** The curated matches of a game, each with the requester's own prediction. */
export async function listGroupFixtures(groupId: number, userId: number, gameId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  return seasonFixturesFor(groupId, gameId, userId)
}

/** Every fixture the group has added across all its games (standard Fixture shape),
 *  for the home page's "our matches" feed. */
export async function groupHomeFixtures(groupId: number, userId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  return getGroupFixtures(groupId)
}

/** Upcoming, still-predictable matches the leader can add to a game — excludes any
 *  fixture already used in ANY of the group's games (a match lives in one game). */
export async function getCandidateFixtures(groupId: number, gameId: number) {
  await assertActiveGame(groupId, gameId)
  const { rows } = await query(
    `SELECT f.id AS "fixtureId", ${FIXTURE_FIELDS}
     FROM fixtures f
     JOIN leagues lg ON lg.id = f.league_id
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     WHERE lg.api_football_id = ANY($2)
       AND f.status = 'NS' AND f.kickoff_at > now()
       AND f.id NOT IN (SELECT fixture_id FROM group_fixtures WHERE group_id = $1)
     ORDER BY f.kickoff_at ASC
     LIMIT 100`,
    [groupId, CONFIGURED_LEAGUE_API_IDS],
  )
  return rows
}

// ---------------------------------------------------------------------------
// Ending a game and the group's history.
// ---------------------------------------------------------------------------

export interface Champion {
  userId: number
  displayName: string
  points: number
}

/** End a specific game: crown the points leader and lock it. */
export async function finishGame(
  groupId: number,
  gameId: number,
  actorId: number,
): Promise<Champion | null> {
  await assertActiveGame(groupId, gameId)
  const standings = await seasonLeaderboard(groupId, gameId)
  const winner = standings[0] ?? null
  await query(
    `UPDATE group_seasons
       SET status = 'finished', finished_at = now(),
           champion_user_id = $2, champion_points = $3
     WHERE id = $1`,
    [gameId, winner?.userId ?? null, winner?.points ?? null],
  )
  await logAudit(groupId, actorId, 'game_finish', `Oyun bitti — Şampiyon: ${winner?.displayName ?? '—'}`)
  return winner ? { userId: winner.userId, displayName: winner.displayName, points: winner.points } : null
}

/** Start a fresh game. A group can run SEVERAL at once, so there is no guard. */
export async function createGame(
  groupId: number,
  title: string | undefined,
  actorId: number,
): Promise<SeasonRef> {
  const { rows: countRows } = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM group_seasons WHERE group_id = $1`,
    [groupId],
  )
  const finalTitle = title?.trim() || `${(countRows[0]?.count ?? 0) + 1}. Oyun`
  const { rows } = await query<SeasonRef>(
    `INSERT INTO group_seasons (group_id, title, status) VALUES ($1, $2, 'active')
     RETURNING id, title, status`,
    [groupId, finalTitle],
  )
  await logAudit(groupId, actorId, 'game_create', `Oyun açıldı: ${finalTitle}`)
  return rows[0]
}

/** The group's admin-action history (newest first) with the acting admin's name. */
export async function getAuditLog(groupId: number, userId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows } = await query(
    `SELECT al.id, al.action, al.summary, al.created_at AS "createdAt",
            COALESCE(u.display_name, 'Silinmiş üye') AS "actorName"
     FROM group_audit_log al
     LEFT JOIN users u ON u.id = al.actor_user_id
     WHERE al.group_id = $1
     ORDER BY al.created_at DESC
     LIMIT 60`,
    [groupId],
  )
  return rows
}

/** Every game the group has run, newest first — the history list. */
export async function listSeasons(groupId: number, userId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows } = await query(
    `SELECT gs.id, gs.title, gs.status, gs.started_at AS "startedAt", gs.finished_at AS "finishedAt",
            gs.champion_points AS "championPoints", gs.champion_user_id AS "championUserId",
            cu.display_name AS "championName",
            COUNT(gf.id)::int AS "matchCount"
     FROM group_seasons gs
     LEFT JOIN users cu ON cu.id = gs.champion_user_id
     LEFT JOIN group_fixtures gf ON gf.season_id = gs.id
     WHERE gs.group_id = $1
     GROUP BY gs.id, cu.display_name
     ORDER BY gs.started_at DESC`,
    [groupId],
  )
  return rows
}

/** A single game's full record: final standings + every match result. */
export async function getSeasonDetail(groupId: number, userId: number, seasonId: number) {
  if (!(await isMember(groupId, userId))) {
    throw AppError.forbidden('You are not a member of this group')
  }
  const { rows: seasonRows } = await query(
    `SELECT gs.id, gs.title, gs.status, gs.started_at AS "startedAt", gs.finished_at AS "finishedAt",
            gs.champion_points AS "championPoints", gs.champion_user_id AS "championUserId",
            cu.display_name AS "championName"
     FROM group_seasons gs LEFT JOIN users cu ON cu.id = gs.champion_user_id
     WHERE gs.id = $1 AND gs.group_id = $2`,
    [seasonId, groupId],
  )
  const season = seasonRows[0]
  if (!season) throw AppError.notFound('Oyun bulunamadı')

  const standings = await seasonLeaderboard(groupId, seasonId)
  const fixtures = await listGroupFixtures(groupId, userId, seasonId)
  const weeks = await seasonWeeks(groupId, seasonId)
  return { season, standings, fixtures, weeks }
}

// ---------------------------------------------------------------------------
// Platform-admin moderation — the app owner can step into ANY group: add/remove
// matches and add/remove points. Access is gated by the route middleware.
// ---------------------------------------------------------------------------

/** Every group in the system, for the platform-admin moderation list. */
export async function adminListGroups() {
  const { rows } = await query(
    `SELECT g.id, g.name, g.admin_user_id AS "adminUserId",
            (SELECT COUNT(*)::int FROM group_members m WHERE m.group_id = g.id) AS "memberCount",
            (SELECT gs.title FROM group_seasons gs
             WHERE gs.group_id = g.id AND gs.status = 'active'
             ORDER BY gs.started_at DESC LIMIT 1) AS "activeSeasonTitle"
     FROM groups g ORDER BY g.created_at DESC`,
  )
  return rows
}

/** Full moderation view of one group: members with points + the current game's matches. */
export async function adminGroupOverview(groupId: number) {
  const { rows } = await query<{ id: number; name: string; adminUserId: number }>(
    `SELECT id, name, admin_user_id AS "adminUserId" FROM groups WHERE id = $1`,
    [groupId],
  )
  const group = rows[0]
  if (!group) throw AppError.notFound('Group not found')
  const activeSeason = await getActiveSeason(groupId)
  const currentSeasonId = await getCurrentSeasonId(groupId)
  const standings = await seasonLeaderboard(groupId, currentSeasonId)
  const fixtures = currentSeasonId
    ? await seasonFixturesFor(groupId, currentSeasonId, group.adminUserId)
    : []
  return { group: { ...group, activeSeason }, standings, fixtures }
}

/** Remove a member from any group (platform admin). The group's own leader is protected. */
export async function adminRemoveMember(groupId: number, targetUserId: number): Promise<void> {
  const { rows } = await query<{ admin_user_id: number }>(
    `SELECT admin_user_id FROM groups WHERE id = $1`,
    [groupId],
  )
  if (!rows[0]) throw AppError.notFound('Group not found')
  if (rows[0].admin_user_id === targetUserId) throw AppError.badRequest('Grup başkanı çıkarılamaz')
  await purgeMembership(groupId, targetUserId)
}

/** Add (positive) or remove (negative) points for a member in the current game. */
export async function addPointAdjustment(
  groupId: number,
  userId: number,
  delta: number,
  reason: string | null,
  createdBy: number,
): Promise<void> {
  const seasonId = await getCurrentSeasonId(groupId)
  if (seasonId === null) throw AppError.badRequest('Bu grupta oyun yok')
  if (!(await isMember(groupId, userId))) throw AppError.badRequest('Bu kullanıcı grupta değil')
  await query(
    `INSERT INTO point_adjustments (group_id, season_id, user_id, delta, reason, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [groupId, seasonId, userId, delta, reason, createdBy],
  )
  const who = await memberName(userId)
  await logAudit(
    groupId,
    createdBy,
    'point_adjust',
    `${who} · ${delta > 0 ? '+' : ''}${delta} puan${reason ? ` — ${reason}` : ''}`,
  )
}

/**
 * Admin-triggered password reset (v1 has no email flow). Generates a one-time
 * temporary password, stores only its hash, and returns the plaintext once so
 * the admin can hand it to the member.
 */
export async function adminResetPassword(groupId: number, targetUserId: number): Promise<string> {
  if (!(await isMember(groupId, targetUserId))) {
    throw AppError.notFound('That user is not a member of this group')
  }
  const temporaryPassword = randomFromAlphabet(10)
  const hash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS)
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, targetUserId])
  return temporaryPassword
}
