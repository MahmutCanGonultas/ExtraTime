import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { requireAuth } from '../auth/requireAuth'
import { AppError } from '../../lib/errors'
import * as repo from './football.repository'
import { getTeamHonours } from './teamTrophies'
import { getTeamHonourYears } from './teamTrophyYears'
import { syncPlayerTransfers } from './sync/jobs'
import { logger } from '../../lib/logger'

export const footballRouter = Router()
// Browse data is behind login (the whole app is), and this also shields the lazy
// player-career transfer fetch from anonymous callers spending API budget.
footballRouter.use(requireAuth)

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
  '/leagues/:id/players',
  asyncHandler(async (req, res) => {
    res.json({ players: await repo.getLeaguePlayers(parseId(req.params.id)) })
  }),
)

footballRouter.get(
  '/players/game/pool',
  asyncHandler(async (_req, res) => {
    res.json({ players: await repo.getPlayerGamePool() })
  }),
)

// Comma-separated numeric id list → number[] (empty string → []), bounded.
function parseIdList(raw: string | undefined): number[] | undefined {
  if (raw === undefined) return undefined
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 40)
}

const guessPoolQuery = z.object({ leagues: z.string().optional(), clubs: z.string().optional() })

footballRouter.get(
  '/players/guess/pool',
  asyncHandler(async (req, res) => {
    const { leagues, clubs } = guessPoolQuery.parse(req.query)
    res.json({ players: await repo.getGuessPool(parseIdList(leagues), parseIdList(clubs)) })
  }),
)

footballRouter.get(
  '/players/guess/search',
  asyncHandler(async (req, res) => {
    const { q } = searchQuerySchema.parse(req.query)
    if (!q || q.length < 2) {
      res.json({ players: [] })
      return
    }
    res.json({ players: await repo.searchGuessPlayers(q) })
  }),
)

footballRouter.get(
  '/players/:apiId',
  asyncHandler(async (req, res) => {
    const player = await repo.getPlayerProfile(parseId(req.params.apiId))
    if (!player) throw AppError.notFound('Player not found')
    res.json({ player })
  }),
)

// Full career: every club from the start of the player's career. Cache-first — the
// first time a player is opened we lazily fetch their transfer history (1 request),
// cache it, then serve from the DB forever. A failed fetch still returns whatever we
// can derive from the season rows we already hold.
footballRouter.get(
  '/players/:apiId/career',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.apiId)
    // Only lazy-fill for a player we actually hold, so random/unknown ids can never
    // drive an API-Football request (budget protection + cache-first invariant).
    if ((await repo.hasPlayer(id)) && !(await repo.hasTransferSync(id))) {
      try {
        await syncPlayerTransfers(id)
      } catch (err) {
        logger.warn({ playerApiId: id, err }, 'transfer lazy-fill failed')
      }
    }
    res.json({ career: await repo.getPlayerCareer(id) })
  }),
)

const searchQuerySchema = z.object({ q: z.string().trim().max(60).optional() })

footballRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q } = searchQuerySchema.parse(req.query)
    if (!q || q.length < 2) {
      res.json({ teams: [], players: [] })
      return
    }
    res.json(await repo.search(q))
  }),
)

const squadQuerySchema = z.object({
  season: z.coerce.number().int().min(1900).max(2100).optional(),
})

footballRouter.get(
  '/teams/:id/squad',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const team = await repo.getTeam(id)
    if (!team) throw AppError.notFound('Team not found')
    const { season } = squadQuerySchema.parse(req.query)
    const data = await repo.getTeamSquadHistory(team.apiFootballId, season)
    res.json({ team, ...data })
  }),
)

footballRouter.get(
  '/teams/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const team = await repo.getTeam(id)
    if (!team) throw AppError.notFound('Team not found')
    const [fixtures, standings, squad] = await Promise.all([
      repo.getTeamFixtures(id),
      repo.getTeamStandings(id),
      repo.getTeamSquad(team.apiFootballId),
    ])
    res.json({
      team,
      fixtures,
      standings,
      squad,
      trophies: getTeamHonours(team.apiFootballId),
      trophyYears: getTeamHonourYears(team.apiFootballId),
    })
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
    const [goals, events, stats] = await Promise.all([
      repo.getFixtureGoals(id),
      repo.getFixtureEvents(id),
      repo.getFixtureStats(id),
    ])
    res.json({ fixture, goals, events, stats })
  }),
)
