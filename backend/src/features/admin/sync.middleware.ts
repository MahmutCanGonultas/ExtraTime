import type { RequestHandler } from 'express'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'

// Guards the sync endpoints when triggered from outside (cron-job.org, GitHub
// Actions) via a shared secret header. Once auth exists, an admin JWT will be
// an accepted alternative — for now the secret is the single gate.
export const requireSyncSecret: RequestHandler = (req, _res, next) => {
  const provided = req.header('x-sync-secret')
  if (!env.SYNC_SECRET || provided !== env.SYNC_SECRET) {
    throw AppError.unauthorized('Invalid or missing sync secret')
  }
  next()
}
