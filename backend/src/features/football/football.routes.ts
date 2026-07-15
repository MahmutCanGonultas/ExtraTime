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
  '/fixtures/:id',
  asyncHandler(async (req, res) => {
    const fixture = await repo.getFixtureById(parseId(req.params.id))
    if (!fixture) throw AppError.notFound('Fixture not found')
    res.json({ fixture })
  }),
)
