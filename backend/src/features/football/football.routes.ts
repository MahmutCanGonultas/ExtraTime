import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { AppError } from '../../lib/errors'
import * as repo from './football.repository'

export const footballRouter = Router()

const idSchema = z.coerce.number().int().positive()

function parseId(raw: string): number {
  const result = idSchema.safeParse(raw)
  if (!result.success) throw AppError.badRequest('Invalid id parameter')
  return result.data
}

const leaguesQuerySchema = z.object({ active: z.enum(['true', 'false']).optional() })

footballRouter.get(
  '/leagues',
  asyncHandler(async (req, res) => {
    const { active } = leaguesQuerySchema.parse(req.query)
    res.json({ leagues: await repo.listLeagues(active === 'true') })
  }),
)

footballRouter.get(
  '/leagues/:id/standings',
  asyncHandler(async (req, res) => {
    res.json({ standings: await repo.getStandings(parseId(req.params.id)) })
  }),
)

const fixtureQuerySchema = z.object({
  status: z.enum(['upcoming', 'finished', 'all']).default('all'),
  round: z.string().optional(),
})

footballRouter.get(
  '/leagues/:id/fixtures',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const q = fixtureQuerySchema.parse(req.query)
    res.json({ fixtures: await repo.getLeagueFixtures(id, q.status, q.round) })
  }),
)

footballRouter.get(
  '/leagues/:id/bracket',
  asyncHandler(async (req, res) => {
    res.json({ bracket: await repo.getBracket(parseId(req.params.id)) })
  }),
)

footballRouter.get(
  '/leagues/:id/topscorers',
  asyncHandler(async (req, res) => {
    res.json({ topscorers: await repo.getTopScorers(parseId(req.params.id)) })
  }),
)

footballRouter.get(
  '/leagues/:id/topassists',
  asyncHandler(async (req, res) => {
    res.json({ topassists: await repo.getTopAssists(parseId(req.params.id)) })
  }),
)

footballRouter.get(
  '/teams/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const team = await repo.getTeam(id)
    if (!team) throw AppError.notFound('Team not found')
    res.json({ team, fixtures: await repo.getTeamFixtures(id) })
  }),
)

footballRouter.get(
  '/fixtures/live',
  asyncHandler(async (_req, res) => {
    res.json({ fixtures: await repo.getLiveFixtures() })
  }),
)

const upcomingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

footballRouter.get(
  '/fixtures/upcoming',
  asyncHandler(async (req, res) => {
    const { limit } = upcomingQuerySchema.parse(req.query)
    res.json({ fixtures: await repo.getUpcomingFixtures(limit) })
  }),
)

footballRouter.get(
  '/fixtures/recent',
  asyncHandler(async (req, res) => {
    const { limit } = upcomingQuerySchema.parse(req.query)
    res.json({ fixtures: await repo.getRecentFixtures(limit) })
  }),
)

footballRouter.get(
  '/fixtures/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const fixture = await repo.getFixtureById(id)
    if (!fixture) throw AppError.notFound('Fixture not found')
    res.json({ fixture, goals: await repo.getFixtureGoals(id) })
  }),
)
