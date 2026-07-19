import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { parseIdParam } from '../../lib/params'
import { requireAuth } from '../auth/requireAuth'
import * as predictions from './predictions.service'

// Mounted under /groups, so paths read as /groups/:groupId/...
export const predictionsRouter = Router()

predictionsRouter.use(requireAuth)

// The outcome (1X2) is required; the exact score is optional and must be given
// as a pair (both numbers) or not at all.
const predictionSchema = z
  .object({
    outcome: z.enum(['HOME', 'DRAW', 'AWAY']),
    predictedHome: z.number().int().min(0).max(99).nullable().optional(),
    predictedAway: z.number().int().min(0).max(99).nullable().optional(),
  })
  .refine((b) => (b.predictedHome == null) === (b.predictedAway == null), {
    message: 'Skor girecekseniz her iki takım için de girin',
  })

// Upsert a prediction. Server-side guards (lock, game membership) live in the service SQL.
predictionsRouter.put(
  '/:groupId/predictions/:fixtureId',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    const fixtureId = parseIdParam(req.params.fixtureId)
    const body = predictionSchema.parse(req.body)
    const prediction = await predictions.upsertPrediction(
      req.userId!,
      groupId,
      fixtureId,
      body.outcome,
      body.predictedHome ?? null,
      body.predictedAway ?? null,
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

// "If live scores froze now" standings for a specific game.
predictionsRouter.get(
  '/:groupId/games/:gameId/leaderboard/live',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    const gameId = parseIdParam(req.params.gameId)
    res.json(await predictions.getProvisionalLeaderboard(groupId, req.userId!, gameId))
  }),
)

// Point-by-point history for a game: every settled prediction (who scored what
// off which match) plus every admin adjustment (who gave it, why).
predictionsRouter.get(
  '/:groupId/games/:gameId/history',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    const gameId = parseIdParam(req.params.gameId)
    res.json({ events: await predictions.getPointsHistory(groupId, req.userId!, gameId) })
  }),
)

predictionsRouter.get(
  '/:groupId/stats',
  asyncHandler(async (req, res) => {
    const groupId = parseIdParam(req.params.groupId)
    res.json(await predictions.getGroupStats(groupId, req.userId!))
  }),
)
