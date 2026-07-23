import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { getDailyGridPublic, validateGridGuess } from './grid.service'
import { getDailyGoalQuiz, checkGoalGuess } from './goal.service'
import { getDailyCareerQuiz, checkCareerGuess, careerWhoQuiz } from './career.service'

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

// GET /api/v1/games/goal — the day's "Gol Kimin?" quiz (10 questions, no answers).
gamesRouter.get(
  '/games/goal',
  asyncHandler(async (_req, res) => {
    res.json({ date: todayUtc(), questions: await getDailyGoalQuiz(todayUtc()) })
  }),
)

const goalGuessSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  choice: z.string().trim().min(1).max(80),
})

// POST /api/v1/games/goal/guess — check one answer. Returns { correct, scorer }.
gamesRouter.post(
  '/games/goal/guess',
  asyncHandler(async (req, res) => {
    const { eventId, choice } = goalGuessSchema.parse(req.body)
    res.json(await checkGoalGuess(eventId, choice))
  }),
)

// GET /api/v1/games/career — the day's "Kariyer Zinciri" quiz (8 pairs, no answers).
gamesRouter.get(
  '/games/career',
  asyncHandler(async (_req, res) => {
    res.json({ date: todayUtc(), questions: await getDailyCareerQuiz(todayUtc()) })
  }),
)

// GET /api/v1/games/career-who — "Kariyer Kimin?" for current players (with crests).
gamesRouter.get(
  '/games/career-who',
  asyncHandler(async (_req, res) => {
    res.json({ date: todayUtc(), questions: await careerWhoQuiz(todayUtc()) })
  }),
)

const careerGuessSchema = z.object({
  playerAApiId: z.coerce.number().int().positive(),
  playerBApiId: z.coerce.number().int().positive(),
  teamApiId: z.coerce.number().int().positive(),
})

// POST /api/v1/games/career/guess — Returns { correct, sharedTeamApiIds }.
gamesRouter.post(
  '/games/career/guess',
  asyncHandler(async (req, res) => {
    const { playerAApiId, playerBApiId, teamApiId } = careerGuessSchema.parse(req.body)
    const { sharedTeamApiIds } = await checkCareerGuess(playerAApiId, playerBApiId)
    res.json({ correct: sharedTeamApiIds.includes(teamApiId), sharedTeamApiIds })
  }),
)
