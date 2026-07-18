import bcrypt from 'bcryptjs'
import { query } from '../../db/pool'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { isUniqueViolation } from '../../lib/pg-error'
import { signToken } from '../../lib/jwt'

const SALT_ROUNDS = 10

// Platform admins bootstrap from ADMIN_EMAILS (the app owner's email is baked
// into the env so there is always at least one admin who cannot be locked out).
export function isAdminEmail(email: string): boolean {
  const admins = env.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.trim().toLowerCase())
}

// A user is a platform admin if they are in ADMIN_EMAILS OR carry the runtime
// is_admin flag (granted from the admin panel).
export function isPlatformAdmin(user: Pick<PublicUser, 'email' | 'isAdmin'>): boolean {
  return user.isAdmin || isAdminEmail(user.email)
}

export interface PublicUser {
  id: number
  email: string
  displayName: string
  isAdmin: boolean
  avatar: string | null
}

export interface AuthResult {
  user: PublicUser
  token: string
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const name = displayName.trim()
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  try {
    const { rows } = await query<{ id: number }>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING id`,
      [normalizedEmail, passwordHash, name],
    )
    const user: PublicUser = {
      id: rows[0].id,
      email: normalizedEmail,
      displayName: name,
      isAdmin: false,
      avatar: null,
    }
    return { user, token: signToken({ userId: user.id }) }
  } catch (err) {
    if (isUniqueViolation(err)) throw AppError.conflict('This email is already registered')
    throw err
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const { rows } = await query<{
    id: number
    password_hash: string
    display_name: string
    is_admin: boolean
    avatar: string | null
  }>(`SELECT id, password_hash, display_name, is_admin, avatar FROM users WHERE email = $1`, [
    normalizedEmail,
  ])
  const row = rows[0]
  // Same error whether the email is unknown or the password is wrong, so an
  // attacker cannot tell which emails exist.
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw AppError.unauthorized('Invalid email or password')
  }
  const user: PublicUser = {
    id: row.id,
    email: normalizedEmail,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    avatar: row.avatar,
  }
  return { user, token: signToken({ userId: user.id }) }
}

// Update the display name and/or avatar. Either field may be omitted (undefined),
// in which case COALESCE leaves the stored value untouched — so the same endpoint
// serves "rename me" and "pick an avatar" without clobbering the other field.
export async function updateProfile(
  userId: number,
  changes: { displayName?: string; avatar?: string | null },
): Promise<PublicUser> {
  const name = changes.displayName?.trim() ?? null
  const avatar = changes.avatar === undefined ? null : changes.avatar
  const { rows } = await query<{
    id: number
    email: string
    display_name: string
    is_admin: boolean
    avatar: string | null
  }>(
    `UPDATE users
        SET display_name = COALESCE($1, display_name),
            avatar       = COALESCE($2, avatar)
      WHERE id = $3
      RETURNING id, email, display_name, is_admin, avatar`,
    [name, avatar, userId],
  )
  const row = rows[0]
  if (!row) throw AppError.notFound('User not found')
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    avatar: row.avatar,
  }
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { rows } = await query<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId],
  )
  const row = rows[0]
  if (!row) throw AppError.notFound('User not found')
  if (!(await bcrypt.compare(currentPassword, row.password_hash))) {
    throw AppError.badRequest('Mevcut şifre yanlış')
  }
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId])
}

export async function getUserById(id: number): Promise<PublicUser | null> {
  const { rows } = await query<{
    id: number
    email: string
    display_name: string
    is_admin: boolean
    avatar: string | null
  }>(`SELECT id, email, display_name, is_admin, avatar FROM users WHERE id = $1`, [id])
  const row = rows[0]
  return row
    ? {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        isAdmin: row.is_admin,
        avatar: row.avatar,
      }
    : null
}
