import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export interface JwtPayload {
  userId: number
}

function secret(): string {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return env.JWT_SECRET
}

export function signToken(payload: JwtPayload): string {
  // The token carries only the user id — never the password or anything secret.
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] }
  return jwt.sign(payload, secret(), options)
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret())
  if (typeof decoded === 'string' || typeof decoded.userId !== 'number') {
    throw new Error('Malformed token payload')
  }
  return { userId: decoded.userId }
}
