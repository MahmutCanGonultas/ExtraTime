import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { parseIdParam } from '../../lib/params'
import { requireAuth } from '../auth/requireAuth'
import { requireGroupAdmin } from './requireGroupAdmin'
import * as groups from './groups.service'
import * as insights from './insights'

export const groupsRouter = Router()

// Everything about groups requires a logged-in user.
groupsRouter.use(requireAuth)

const createSchema = z.object({ name: z.string().min(2).max(60) })
const joinSchema = z.object({ inviteCode: z.string().min(4).max(16) })
const addFixtureSchema = z.object({ fixtureId: z.number().int().positive() })
const newGameSchema = z.object({ title: z.string().max(60).optional() })

// Groups the current user belongs to (used to resolve their active group).
groupsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ groups: await groups.getMyGroups(req.userId!) })
  }),
)

groupsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name } = createSchema.parse(req.body)
    res.status(201).json({ group: await groups.createGroup(name, req.userId!) })
  }),
)

groupsRouter.post(
  '/join',
  asyncHandler(async (req, res) => {
    const { inviteCode } = joinSchema.parse(req.body)
    res.json({ group: await groups.joinGroup(inviteCode, req.userId!) })
  }),
)

groupsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ group: await groups.getGroupDetail(id, req.userId!) })
  }),
)

// ---- Games: a group can run SEVERAL at once, each with its own matches ----

// Every game the group runs (active + finished). Members.
groupsRouter.get(
  '/:id/games',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ games: await groups.listSeasons(id, req.userId!) })
  }),
)

// Start a fresh game. Admin only. (No limit — many can run in parallel.)
groupsRouter.post(
  '/:id/games',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const { title } = newGameSchema.parse(req.body ?? {})
    res.status(201).json({ game: await groups.createGame(id, title) })
  }),
)

// One game's full record: matches (with my prediction) + standings. Members.
groupsRouter.get(
  '/:id/games/:gameId',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const gameId = parseIdParam(req.params.gameId)
    res.json(await groups.getSeasonDetail(id, req.userId!, gameId))
  }),
)

// Matches the leader can still add to a game. Admin only.
groupsRouter.get(
  '/:id/games/:gameId/candidate-fixtures',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const gameId = parseIdParam(req.params.gameId)
    res.json({ fixtures: await groups.getCandidateFixtures(id, gameId) })
  }),
)

groupsRouter.post(
  '/:id/games/:gameId/fixtures',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const gameId = parseIdParam(req.params.gameId)
    const { fixtureId } = addFixtureSchema.parse(req.body)
    await groups.addGroupFixture(id, gameId, fixtureId, req.userId!)
    res.status(201).json({ ok: true })
  }),
)

groupsRouter.delete(
  '/:id/games/:gameId/fixtures/:fixtureId',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const gameId = parseIdParam(req.params.gameId)
    const fixtureId = parseIdParam(req.params.fixtureId)
    await groups.removeGroupFixture(id, gameId, fixtureId)
    res.status(204).send()
  }),
)

// End a game — crown its leader as champion. Admin only.
groupsRouter.post(
  '/:id/games/:gameId/finish',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const gameId = parseIdParam(req.params.gameId)
    res.json({ champion: await groups.finishGame(id, gameId) })
  }),
)

// Head-to-head record of the caller vs every other member. Members.
groupsRouter.get(
  '/:id/rivalries',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ rivalries: await insights.getRivalries(id, req.userId!) })
  }),
)

// A member's trophy cabinet (titles, winning jokers, exact scores). Members.
groupsRouter.get(
  '/:id/members/:userId/trophies',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const targetUserId = parseIdParam(req.params.userId)
    res.json(await insights.getMemberTrophies(id, targetUserId, req.userId!))
  }),
)

groupsRouter.post(
  '/:id/regenerate-invite',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ inviteCode: await groups.regenerateInvite(id) })
  }),
)

// Delete the whole group — leader only.
groupsRouter.delete(
  '/:id',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    await groups.deleteGroup(parseIdParam(req.params.id))
    res.status(204).send()
  }),
)

groupsRouter.delete(
  '/:id/members/:userId',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const targetUserId = parseIdParam(req.params.userId)
    await groups.removeMember(id, targetUserId, req.userId!)
    res.status(204).send()
  }),
)

// NOTE: a group leader manages only the game (matches, members) — never account
// credentials. Resetting a member's password is a PLATFORM-ADMIN action, exposed
// solely under /admin, not to group leaders.
