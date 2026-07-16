import { Router } from 'express'
import { z } from 'zod'
import { query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { asyncHandler } from '../../lib/middleware/async'
import { parseIdParam } from '../../lib/params'
import { requireSyncAccess } from './sync.middleware'
import * as groups from '../groups/groups.service'
import * as predictions from '../predictions/predictions.service'
import {
  backfillAllSeasons,
  seedLeaguesJob,
  syncFixtures,
  syncLiveScores,
  syncStandings,
  syncTopAssists,
  syncTopScorers,
} from '../football/sync/jobs'
import { syncResultsAndSettle } from '../predictions/settle'

export const adminRouter = Router()

// Every admin route requires the sync secret OR a platform-admin login.
adminRouter.use(requireSyncAccess)

// Moderation actions must be performed by a logged-in platform admin (so we know
// WHO did it) — the shared sync secret alone is not enough.
function requireAdminUser(req: { userId?: number }): number {
  if (!req.userId) throw AppError.forbidden('Bu işlem için platform-admin girişi gerekir')
  return req.userId
}

const adjustmentSchema = z.object({
  userId: z.number().int().positive(),
  delta: z.number().int().min(-1000).max(1000),
  reason: z.string().max(200).optional(),
})
const addFixtureSchema = z.object({ fixtureId: z.number().int().positive() })
const adminPredictionSchema = z
  .object({
    userId: z.number().int().positive(),
    fixtureId: z.number().int().positive(),
    outcome: z.enum(['HOME', 'DRAW', 'AWAY']),
    predictedHome: z.number().int().min(0).max(99).nullable().optional(),
    predictedAway: z.number().int().min(0).max(99).nullable().optional(),
  })
  .refine((b) => (b.predictedHome == null) === (b.predictedAway == null), {
    message: 'Skor girecekseniz her iki takım için de girin',
  })

// --- Platform-admin group moderation: step into any group ---
adminRouter.get(
  '/groups',
  asyncHandler(async (_req, res) => res.json({ groups: await groups.adminListGroups() })),
)
adminRouter.get(
  '/groups/:id',
  asyncHandler(async (req, res) => res.json(await groups.adminGroupOverview(parseIdParam(req.params.id)))),
)
adminRouter.get(
  '/groups/:id/candidate-fixtures',
  asyncHandler(async (req, res) =>
    res.json({ fixtures: await groups.getCandidateFixtures(parseIdParam(req.params.id)) }),
  ),
)
adminRouter.post(
  '/groups/:id/fixtures',
  asyncHandler(async (req, res) => {
    const adminId = requireAdminUser(req)
    const { fixtureId } = addFixtureSchema.parse(req.body)
    await groups.addGroupFixture(parseIdParam(req.params.id), fixtureId, adminId)
    res.status(201).json({ ok: true })
  }),
)
adminRouter.delete(
  '/groups/:id/fixtures/:fixtureId',
  asyncHandler(async (req, res) => {
    await groups.removeGroupFixture(parseIdParam(req.params.id), parseIdParam(req.params.fixtureId))
    res.status(204).send()
  }),
)
adminRouter.post(
  '/groups/:id/adjustments',
  asyncHandler(async (req, res) => {
    const adminId = requireAdminUser(req)
    const body = adjustmentSchema.parse(req.body)
    await groups.addPointAdjustment(
      parseIdParam(req.params.id),
      body.userId,
      body.delta,
      body.reason ?? null,
      adminId,
    )
    res.status(201).json({ ok: true })
  }),
)
adminRouter.delete(
  '/groups/:id/members/:userId',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await groups.adminRemoveMember(parseIdParam(req.params.id), parseIdParam(req.params.userId))
    res.status(204).send()
  }),
)
adminRouter.post(
  '/groups/:id/members/:userId/reset-password',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const temporaryPassword = await groups.adminResetPassword(
      parseIdParam(req.params.id),
      parseIdParam(req.params.userId),
    )
    res.json({ temporaryPassword })
  }),
)

// Every member's prediction for a match (bypasses the pre-lock privacy screen).
adminRouter.get(
  '/groups/:id/fixtures/:fixtureId/predictions',
  asyncHandler(async (req, res) => {
    res.json({
      predictions: await predictions.adminFixturePredictions(
        parseIdParam(req.params.id),
        parseIdParam(req.params.fixtureId),
      ),
    })
  }),
)

// Override any member's prediction (the only way a prediction can change).
adminRouter.post(
  '/groups/:id/predictions',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const b = adminPredictionSchema.parse(req.body)
    await predictions.adminSetPrediction(
      parseIdParam(req.params.id),
      b.userId,
      b.fixtureId,
      b.outcome,
      b.predictedHome ?? null,
      b.predictedAway ?? null,
    )
    res.status(201).json({ ok: true })
  }),
)

adminRouter.post(
  '/sync/seed',
  asyncHandler(async (_req, res) => res.json(await seedLeaguesJob())),
)

// One-time historical load across all seasons (seed + fixtures + standings + scorers).
adminRouter.post(
  '/sync/backfill',
  asyncHandler(async (_req, res) => res.json({ results: await backfillAllSeasons() })),
)
adminRouter.post(
  '/sync/fixtures',
  asyncHandler(async (_req, res) => res.json(await syncFixtures())),
)
adminRouter.post(
  '/sync/results',
  asyncHandler(async (_req, res) => res.json(await syncResultsAndSettle())),
)

adminRouter.post(
  '/sync/live',
  asyncHandler(async (_req, res) => res.json(await syncLiveScores())),
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
