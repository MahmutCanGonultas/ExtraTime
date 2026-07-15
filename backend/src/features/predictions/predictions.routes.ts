import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { parseIdParam } from '../../lib/params'
import { requireAuth } from '../auth/requireAuth'
import * as predictions from './predictions.service'

// Mounted under /groups, so paths read as /groups/:groupId/...
export const predictionsRouter = Router()

predictionsRouter.use(requireAuth)

const scoreSchema = z.object({
  predictedHome: z.number().int().min(0).max(99),
  predictedAway: z.number().int().min(0).max(99),
})

// Upsert a prediction. Server-side lock lives inside the service SQL.
predictionsRouter.put(
  '/:groupId/predictions/:fixtureId',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    const fixtureId = parseIdParam(req.params.fixtureId)
    const body = scoreSchema.parse(req.body)
    const prediction = await predictions.upsertPrediction(
      req.userId!,
      groupId,
      fixtureId,
      body.predictedHome,
      body.predictedAway,
    )
    res.json({ prediction })
  }),
)

predictionsRouter.get(
  '/:groupId/predictions',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    res.json({ predictions: await predictions.getMyPredictions(groupId, req.userId!) })
  }),
)

predictionsRouter.get(
  '/:groupId/fixtures/:fixtureId/predictions',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    const fixtureId = parseIdParam(req.params.fixtureId)
    res.json(await predictions.getFixturePredictions(groupId, fixtureId, req.userId!))
  }),
)

predictionsRouter.get(
  '/:groupId/leaderboard',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    res.json({ leaderboard: await predictions.getLeaderboard(groupId, req.userId!) })
  }),
)

predictionsRouter.get(
  '/:groupId/stats',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    res.json(await predictions.getGroupStats(groupId, req.userId!))
  }),
)
