import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { AppError } from '../../lib/errors'
import { query } from '../../db/pool'
import { requireSyncSecret } from './sync.middleware'
import { settleFixture } from '../predictions/settle'

// DEV ONLY. This router is registered only when NODE_ENV !== 'production' (see
// api/v1) AND still requires the sync secret — two layers, because a "make up a
// score" endpoint must never be reachable in production. It lets us drive the
// whole predict -> lock -> settle -> leaderboard loop locally without waiting
// for real matches to finish.
export const devRouter = Router()

devRouter.use(requireSyncSecret)

const simulateSchema = z.object({
  fixtureId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
})

devRouter.post(
  '/simulate-result',
  asyncHandler(async (req, res) => {
    const body = simulateSchema.parse(req.body)
    // A finished match has, by definition, already kicked off — push kickoff to
    // the past so lock behavior is consistent too.
    const { rowCount } = await query(
      `UPDATE fixtures
       SET status = 'FT', home_score = $2, away_score = $3,
           kickoff_at = now() - interval '2 hours', updated_at = now()
       WHERE id = $1`,
      [body.fixtureId, body.homeScore, body.awayScore],
    )
    if ((rowCount ?? 0) === 0) throw AppError.notFound('Fixture not found')

    const settled = await settleFixture(body.fixtureId)
    res.json({ ok: true, settled })
  }),
)
