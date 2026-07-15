import type { RequestHandler } from 'express'
import { AppError } from '../../lib/errors'
import { verifyToken } from '../../lib/jwt'

/**
 * Gate for protected routes. The flow:
 *   1. Read the "Authorization: Bearer <token>" header.
 *   2. Verify the token's signature with JWT_SECRET — this proves the token was
 *      issued by us and hasn't been tampered with.
 *   3. Put the user id from the payload onto req.userId.
 *
 * req is the one object that lives for the whole request, so it is the natural
 * place to carry "who is making this request" from middleware to controller.
 * After this runs, a controller can trust req.userId without re-checking anything.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization')
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing bearer token')
  }

  const token = header.slice('Bearer '.length).trim()
  try {
    const payload = verifyToken(token)
    req.userId = payload.userId
    next()
  } catch {
    throw AppError.unauthorized('Invalid or expired token')
  }
}
