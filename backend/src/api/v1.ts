import { Router } from 'express'
import { isProduction } from '../config/env'
import { authRouter } from '../features/auth/auth.routes'
import { groupsRouter } from '../features/groups/groups.routes'
import { predictionsRouter } from '../features/predictions/predictions.routes'
import { adminRouter } from '../features/admin/admin.routes'
import { devRouter } from '../features/admin/dev.routes'
import { footballRouter } from '../features/football/football.routes'

// Aggregates every feature router under /api/v1. New features mount here.
export const v1Router = Router()

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

export default v1Router
