import bcrypt from 'bcryptjs'
import { query } from '../../db/pool'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { isUniqueViolation } from '../../lib/pg-error'
import { signToken } from '../../lib/jwt'

const SALT_ROUNDS = 10

// Platform admins (the app owner) are configured by email in ADMIN_EMAILS.
export function isPlatformAdmin(email: string): boolean {
  const admins = env.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.trim().toLowerCase())
}

export interface PublicUser {
  id: number
  email: string
  displayName: string
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
    const user: PublicUser = { id: rows[0].id, email: normalizedEmail, displayName: name }
    return { user, token: signToken({ userId: user.id }) }
  } catch (err) {
    if (isUniqueViolation(err)) throw AppError.conflict('This email is already registered')
    throw err
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const { rows } = await query<{ id: number; password_hash: string; display_name: string }>(
    `SELECT id, password_hash, display_name FROM users WHERE email = $1`,
    [normalizedEmail],
  )
  const row = rows[0]
  // Same error whether the email is unknown or the password is wrong, so an
  // attacker cannot tell which emails exist.
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw AppError.unauthorized('Invalid email or password')
  }
  const user: PublicUser = { id: row.id, email: normalizedEmail, displayName: row.display_name }
  return { user, token: signToken({ userId: user.id }) }
}

export async function getUserById(id: number): Promise<PublicUser | null> {
  const { rows } = await query<{ id: number; email: string; display_name: string }>(
    `SELECT id, email, display_name FROM users WHERE id = $1`,
    [id],
  )
  const row = rows[0]
  return row ? { id: row.id, email: row.email, displayName: row.display_name } : null
}
