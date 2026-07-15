import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { isUniqueViolation } from '../../lib/pg-error'

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
  // Retry on the rare invite-code collision (UNIQUE violation).
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = randomFromAlphabet(8)
    try {
      const { rows } = await query<{ id: number }>(
        `INSERT INTO groups (name, invite_code, admin_user_id) VALUES ($1, $2, $3) RETURNING id`,
        [name.trim(), inviteCode, adminUserId],
      )
      const groupId = rows[0].id
      await query(
        `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [groupId, adminUserId],
      )
      return { id: groupId, name: name.trim(), inviteCode, adminUserId }
    } catch (err) {
      if (isUniqueViolation(err)) continue
      throw err
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

  const members = await query<{ id: number; displayName: string; joinedAt: Date }>(
    `SELECT u.id, u.display_name AS "displayName", gm.joined_at AS "joinedAt"
     FROM group_members gm JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 ORDER BY gm.joined_at`,
    [groupId],
  )

  const isAdmin = group.admin_user_id === requesterId
  return {
    id: group.id,
    name: group.name,
    adminUserId: group.admin_user_id,
    isAdmin,
    // Only the admin sees the invite code.
    inviteCode: isAdmin ? group.invite_code : undefined,
    members: members.rows,
  }
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

export async function removeMember(groupId: number, targetUserId: number, adminUserId: number): Promise<void> {
  if (targetUserId === adminUserId) {
    throw AppError.badRequest('The admin cannot be removed from the group')
  }
  await query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, targetUserId])
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
