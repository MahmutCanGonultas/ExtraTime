import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { getDailyGridPublic, validateGridGuess } from './grid.service'

export const gamesRouter = Router()

// Today's grid key in UTC, so every friend sees the same puzzle regardless of
// where they open it (matches the app's UTC-everywhere rule).
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/v1/games/grid — the day's Kare Bulmaca (categories only, no answers).
gamesRouter.get(
  '/games/grid',
  asyncHandler(async (_req, res) => {
    res.json(await getDailyGridPublic(todayUtc()))
  }),
)

const guessSchema = z.object({
  row: z.coerce.number().int().min(0).max(2),
  col: z.coerce.number().int().min(0).max(2),
  playerApiId: z.coerce.number().int().positive(),
})

// POST /api/v1/games/grid/guess — check one cell. Returns { correct, player? }.
gamesRouter.post(
  '/games/grid/guess',
  asyncHandler(async (req, res) => {
    const { row, col, playerApiId } = guessSchema.parse(req.body)
    res.json(await validateGridGuess(todayUtc(), row, col, playerApiId))
  }),
)
