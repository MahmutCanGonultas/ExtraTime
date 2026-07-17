import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getPool, query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { isUniqueViolation } from '../../lib/pg-error'
import { isAdminEmail } from '../auth/auth.service'
import { regenerateInvite } from '../groups/groups.service'

const SALT_ROUNDS = 10
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I/L
function randomPassword(len = 10): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i += 1) out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length]
  return out
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface AdminStats {
  users: number
  admins: number
  newUsers7d: number
  groups: number
  games: number
  activeGames: number
  predictions: number
  fixtures: number
  players: number
  leagues: number
  apiRequestsToday: number
}

export async function adminStats(): Promise<AdminStats> {
  const { rows } = await query<Record<keyof AdminStats, number>>(
    `SELECT
       (SELECT COUNT(*) FROM users)::int AS users,
       (SELECT COUNT(*) FROM users WHERE is_admin)::int AS admins,
       (SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '7 days')::int AS "newUsers7d",
       (SELECT COUNT(*) FROM groups)::int AS groups,
       (SELECT COUNT(*) FROM group_seasons)::int AS games,
       (SELECT COUNT(*) FROM group_seasons WHERE status = 'active')::int AS "activeGames",
       (SELECT COUNT(*) FROM predictions)::int AS predictions,
       (SELECT COUNT(*) FROM fixtures)::int AS fixtures,
       (SELECT COUNT(*) FROM players)::int AS players,
       (SELECT COUNT(*) FROM leagues)::int AS leagues,
       (SELECT COALESCE(SUM(api_requests_used), 0) FROM sync_logs
         WHERE ran_at >= date_trunc('day', now()))::int AS "apiRequestsToday"`,
  )
  return rows[0]
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: number
  email: string
  displayName: string
  isAdmin: boolean // effective (env OR flag)
  isEnvAdmin: boolean // baked into ADMIN_EMAILS — cannot be demoted/deleted here
  createdAt: string
  groupCount: number
  ownedGroups: number
  predictionCount: number
}

export async function adminListUsers(search: string): Promise<AdminUser[]> {
  const term = search.trim()
  const like = `%${term}%`
  const { rows } = await query<{
    id: number
    email: string
    displayName: string
    isAdminFlag: boolean
    createdAt: string
    groupCount: number
    ownedGroups: number
    predictionCount: number
  }>(
    `SELECT u.id, u.email, u.display_name AS "displayName", u.is_admin AS "isAdminFlag",
            u.created_at AS "createdAt",
            (SELECT COUNT(*) FROM group_members gm WHERE gm.user_id = u.id)::int AS "groupCount",
            (SELECT COUNT(*) FROM groups g WHERE g.admin_user_id = u.id)::int AS "ownedGroups",
            (SELECT COUNT(*) FROM predictions p WHERE p.user_id = u.id)::int AS "predictionCount"
     FROM users u
     WHERE $1 = '' OR unaccent(u.display_name) ILIKE unaccent($2) OR u.email ILIKE $2
     ORDER BY u.created_at DESC
     LIMIT 200`,
    [term, like],
  )
  return rows.map((r) => {
    const isEnvAdmin = isAdminEmail(r.email)
    return {
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      isAdmin: r.isAdminFlag || isEnvAdmin,
      isEnvAdmin,
      createdAt: r.createdAt,
      groupCount: r.groupCount,
      ownedGroups: r.ownedGroups,
      predictionCount: r.predictionCount,
    }
  })
}

export interface AdminUserGroup {
  id: number
  name: string
  isOwner: boolean
  memberCount: number
}
export interface AdminUserDetail extends AdminUser {
  groups: AdminUserGroup[]
}

export async function adminUserDetail(userId: number): Promise<AdminUserDetail> {
  const [user] = await adminListUsersByIds([userId])
  if (!user) throw AppError.notFound('Kullanıcı bulunamadı')
  const { rows: groups } = await query<AdminUserGroup>(
    `SELECT g.id, g.name, (g.admin_user_id = $1) AS "isOwner",
            (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id)::int AS "memberCount"
     FROM group_members gm JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = $1
     ORDER BY g.name`,
    [userId],
  )
  return { ...user, groups }
}

// Small helper so detail reuses the same enrichment as the list.
async function adminListUsersByIds(ids: number[]): Promise<AdminUser[]> {
  if (ids.length === 0) return []
  const { rows } = await query<{
    id: number
    email: string
    displayName: string
    isAdminFlag: boolean
    createdAt: string
    groupCount: number
    ownedGroups: number
    predictionCount: number
  }>(
    `SELECT u.id, u.email, u.display_name AS "displayName", u.is_admin AS "isAdminFlag",
            u.created_at AS "createdAt",
            (SELECT COUNT(*) FROM group_members gm WHERE gm.user_id = u.id)::int AS "groupCount",
            (SELECT COUNT(*) FROM groups g WHERE g.admin_user_id = u.id)::int AS "ownedGroups",
            (SELECT COUNT(*) FROM predictions p WHERE p.user_id = u.id)::int AS "predictionCount"
     FROM users u WHERE u.id = ANY($1)`,
    [ids],
  )
  return rows.map((r) => {
    const isEnvAdmin = isAdminEmail(r.email)
    return {
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      isAdmin: r.isAdminFlag || isEnvAdmin,
      isEnvAdmin,
      createdAt: r.createdAt,
      groupCount: r.groupCount,
      ownedGroups: r.ownedGroups,
      predictionCount: r.predictionCount,
    }
  })
}

async function requireUser(userId: number): Promise<{ email: string; isAdminFlag: boolean }> {
  const { rows } = await query<{ email: string; is_admin: boolean }>(
    `SELECT email, is_admin FROM users WHERE id = $1`,
    [userId],
  )
  if (!rows[0]) throw AppError.notFound('Kullanıcı bulunamadı')
  return { email: rows[0].email, isAdminFlag: rows[0].is_admin }
}

export async function adminResetUserPassword(userId: number): Promise<string> {
  await requireUser(userId)
  const temporaryPassword = randomPassword(10)
  const hash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS)
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId])
  return temporaryPassword
}

export async function adminUpdateUser(
  userId: number,
  patch: { displayName?: string; email?: string },
): Promise<void> {
  await requireUser(userId)
  const sets: string[] = []
  const args: unknown[] = []
  if (patch.displayName != null) {
    args.push(patch.displayName.trim())
    sets.push(`display_name = $${args.length}`)
  }
  if (patch.email != null) {
    args.push(patch.email.trim().toLowerCase())
    sets.push(`email = $${args.length}`)
  }
  if (sets.length === 0) return
  args.push(userId)
  try {
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${args.length}`, args)
  } catch (err) {
    if (isUniqueViolation(err)) throw AppError.conflict('Bu e-posta zaten kayıtlı')
    throw err
  }
}

export async function adminSetUserAdmin(
  targetUserId: number,
  makeAdmin: boolean,
  actingAdminId: number,
): Promise<void> {
  if (targetUserId === actingAdminId) {
    throw AppError.badRequest('Kendi yönetici yetkini buradan değiştiremezsin')
  }
  const target = await requireUser(targetUserId)
  // An env-configured admin's status comes from ADMIN_EMAILS; toggling the flag
  // wouldn't change it, so refuse to avoid a misleading no-op.
  if (isAdminEmail(target.email)) {
    throw AppError.badRequest('Bu kullanıcı ADMIN_EMAILS ile yönetici — buradan değiştirilemez')
  }
  await query(`UPDATE users SET is_admin = $1 WHERE id = $2`, [makeAdmin, targetUserId])
}

export async function adminDeleteUser(targetUserId: number, actingAdminId: number): Promise<void> {
  if (targetUserId === actingAdminId) {
    throw AppError.badRequest('Kendini silemezsin')
  }
  const target = await requireUser(targetUserId)
  if (isAdminEmail(target.email)) {
    throw AppError.badRequest('Platform sahibini (ADMIN_EMAILS) silemezsin')
  }
  const pool = getPool()
  if (!pool) throw AppError.badRequest('Veritabanı bağlı değil')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Groups this user owns cascade-delete their members, seasons, curated
    // fixtures, predictions and adjustments…
    await client.query(`DELETE FROM groups WHERE admin_user_id = $1`, [targetUserId])
    // …then the user (cascades their memberships/predictions in other groups).
    await client.query(`DELETE FROM users WHERE id = $1`, [targetUserId])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface AdminGroup {
  id: number
  name: string
  inviteCode: string
  ownerId: number
  ownerName: string | null
  createdAt: string
  memberCount: number
  gameCount: number
}

export async function adminListAllGroups(): Promise<AdminGroup[]> {
  const { rows } = await query<AdminGroup>(
    `SELECT g.id, g.name, g.invite_code AS "inviteCode", g.admin_user_id AS "ownerId",
            ou.display_name AS "ownerName", g.created_at AS "createdAt",
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id)::int AS "memberCount",
            (SELECT COUNT(*) FROM group_seasons s WHERE s.group_id = g.id)::int AS "gameCount"
     FROM groups g LEFT JOIN users ou ON ou.id = g.admin_user_id
     ORDER BY g.created_at DESC`,
  )
  return rows
}

export async function adminDeleteGroup(groupId: number): Promise<void> {
  const { rowCount } = await query(`DELETE FROM groups WHERE id = $1`, [groupId])
  if (!rowCount) throw AppError.notFound('Grup bulunamadı')
}

export async function adminRenameGroup(groupId: number, name: string): Promise<void> {
  const { rowCount } = await query(`UPDATE groups SET name = $1 WHERE id = $2`, [name.trim(), groupId])
  if (!rowCount) throw AppError.notFound('Grup bulunamadı')
}

export async function adminRegenerateInvite(groupId: number): Promise<string> {
  const { rows } = await query(`SELECT 1 FROM groups WHERE id = $1`, [groupId])
  if (!rows[0]) throw AppError.notFound('Grup bulunamadı')
  return regenerateInvite(groupId)
}

export async function adminTransferGroup(groupId: number, newOwnerEmail: string): Promise<void> {
  const g = await query(`SELECT 1 FROM groups WHERE id = $1`, [groupId])
  if (!g.rows[0]) throw AppError.notFound('Grup bulunamadı')
  const u = await query<{ id: number }>(`SELECT id FROM users WHERE email = $1`, [
    newOwnerEmail.trim().toLowerCase(),
  ])
  if (!u.rows[0]) throw AppError.notFound('Bu e-postayla kullanıcı yok')
  const newOwnerId = u.rows[0].id
  // The new owner must be a member; add them if they are not already.
  await query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, newOwnerId],
  )
  await query(`UPDATE groups SET admin_user_id = $1 WHERE id = $2`, [newOwnerId, groupId])
}

export async function adminAddMemberByEmail(groupId: number, email: string): Promise<void> {
  const g = await query(`SELECT 1 FROM groups WHERE id = $1`, [groupId])
  if (!g.rows[0]) throw AppError.notFound('Grup bulunamadı')
  const u = await query<{ id: number }>(`SELECT id FROM users WHERE email = $1`, [
    email.trim().toLowerCase(),
  ])
  if (!u.rows[0]) throw AppError.notFound('Bu e-postayla kullanıcı yok')
  await query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, u.rows[0].id],
  )
}
