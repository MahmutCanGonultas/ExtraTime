import { Router } from 'express'
import { adminRouter } from '../features/admin/admin.routes'
import { footballRouter } from '../features/football/football.routes'

// Aggregates every feature router under /api/v1. New features mount here.
export const v1Router = Router()

v1Router.use('/admin', adminRouter)
v1Router.use(footballRouter)

export default v1Router
