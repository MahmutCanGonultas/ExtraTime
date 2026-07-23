import { Router } from 'express'
import { isProduction } from '../config/env'
import { authRouter } from '../features/auth/auth.routes'
import { groupsRouter } from '../features/groups/groups.routes'
import { predictionsRouter } from '../features/predictions/predictions.routes'
import { adminRouter } from '../features/admin/admin.routes'
import { devRouter } from '../features/admin/dev.routes'
import { footballRouter } from '../features/football/football.routes'
import { gamesRouter } from '../features/games/games.routes'

// Aggregates every feature router under /api/v1. New features mount here.
export const v1Router = Router()

// Unauthenticated liveness probe. Under the maintenance kill switch the app-level
// guard answers 503 before this ever runs, so the frontend can hit it once on load
// to learn the site is down without waiting for a real query to fail.
v1Router.get('/status', (_req, res) => {
  res.json({ ok: true })
})

v1Router.use('/auth', authRouter)
v1Router.use('/groups', groupsRouter)
// Prediction + leaderboard routes are also group-scoped, so they share /groups.
v1Router.use('/groups', predictionsRouter)
v1Router.use('/admin', adminRouter)
// The dev simulator endpoint simply does not exist in production.
if (!isProduction) {
  v1Router.use('/admin/dev', devRouter)
}
v1Router.use(footballRouter)
v1Router.use(gamesRouter)

export default v1Router
