import { Router } from 'express'
import { query } from '../../db/pool'
import { asyncHandler } from '../../lib/middleware/async'
import { requireSyncSecret } from './sync.middleware'
import {
  seedLeaguesJob,
  syncFixtures,
  syncResults,
  syncStandings,
  syncTopAssists,
  syncTopScorers,
} from '../football/sync/jobs'

export const adminRouter = Router()

// Every admin route requires the sync secret.
adminRouter.use(requireSyncSecret)

adminRouter.post(
  '/sync/seed',
  asyncHandler(async (_req, res) => res.json(await seedLeaguesJob())),
)
adminRouter.post(
  '/sync/fixtures',
  asyncHandler(async (_req, res) => res.json(await syncFixtures())),
)
adminRouter.post(
  '/sync/results',
  asyncHandler(async (_req, res) => res.json(await syncResults())),
)
adminRouter.post(
  '/sync/standings',
  asyncHandler(async (_req, res) => res.json(await syncStandings())),
)
adminRouter.post(
  '/sync/topscorers',
  asyncHandler(async (_req, res) => res.json(await syncTopScorers())),
)
adminRouter.post(
  '/sync/topassists',
  asyncHandler(async (_req, res) => res.json(await syncTopAssists())),
)

// Latest run per job, for the admin sync-health screen.
adminRouter.get(
  '/sync/status',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT DISTINCT ON (job_name)
         job_name, ran_at, records_upserted, api_requests_used, success, error_message
       FROM sync_logs
       ORDER BY job_name, ran_at DESC`,
    )
    res.json({ jobs: rows })
  }),
)
