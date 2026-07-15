import type { RequestHandler } from 'express'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { asyncHandler } from '../../lib/middleware/async'
import { verifyToken } from '../../lib/jwt'
import { getUserById, isPlatformAdmin } from '../auth/auth.service'

// Secret-only gate: external triggers (cron-job.org, GitHub Actions) send the
// shared secret. Used by the dev simulator.
export const requireSyncSecret: RequestHandler = (req, _res, next) => {
  const provided = req.header('x-sync-secret')
  if (!env.SYNC_SECRET || provided !== env.SYNC_SECRET) {
    throw AppError.unauthorized('Invalid or missing sync secret')
  }
  next()
}

// Broader gate for /admin/sync/*: passes with a valid SYNC_SECRET header OR a
// logged-in platform admin (so the admin panel can trigger syncs with a JWT).
export const requireSyncAccess = asyncHandler(async (req, _res, next) => {
  const provided = req.header('x-sync-secret')
  if (env.SYNC_SECRET && provided === env.SYNC_SECRET) {
    next()
    return
  }

  const header = req.header('authorization')
  if (header?.startsWith('Bearer ')) {
    try {
      const { userId } = verifyToken(header.slice('Bearer '.length).trim())
      const user = await getUserById(userId)
      if (user && isPlatformAdmin(user.email)) {
        req.userId = userId
        next()
        return
      }
    } catch {
      // fall through to the error below
    }
  }
  throw AppError.forbidden('Requires the sync secret or a platform-admin login')
})
