import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { parseIdParam } from '../../lib/params'
import { requireAuth } from '../auth/requireAuth'
import { requireGroupAdmin } from './requireGroupAdmin'
import * as groups from './groups.service'

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

// ---- The group's current game: curated matches, ending, history ----

// The active game's matches (each with the caller's own prediction). Members.
groupsRouter.get(
  '/:id/fixtures',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ fixtures: await groups.listGroupFixtures(id, req.userId!) })
  }),
)

// Matches the leader can still add to the current game. Admin only.
groupsRouter.get(
  '/:id/candidate-fixtures',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ fixtures: await groups.getCandidateFixtures(id) })
  }),
)

groupsRouter.post(
  '/:id/fixtures',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const { fixtureId } = addFixtureSchema.parse(req.body)
    await groups.addGroupFixture(id, fixtureId, req.userId!)
    res.status(201).json({ ok: true })
  }),
)

groupsRouter.delete(
  '/:id/fixtures/:fixtureId',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const fixtureId = parseIdParam(req.params.fixtureId)
    await groups.removeGroupFixture(id, fixtureId)
    res.status(204).send()
  }),
)

// Set (or move) the caller's joker match (2x points) — any member.
groupsRouter.put(
  '/:id/joker/:fixtureId',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const fixtureId = parseIdParam(req.params.fixtureId)
    await groups.setJoker(id, req.userId!, fixtureId)
    res.json({ ok: true })
  }),
)

// End the current game — crown the leader as champion. Admin only.
groupsRouter.post(
  '/:id/finish',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ champion: await groups.finishActiveSeason(id) })
  }),
)

// Start a fresh game (only after the previous one is finished). Admin only.
groupsRouter.post(
  '/:id/new-game',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const { title } = newGameSchema.parse(req.body ?? {})
    res.status(201).json({ season: await groups.startNewSeason(id, title) })
  }),
)

// The group's history — every game it has run. Members.
groupsRouter.get(
  '/:id/seasons',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    res.json({ seasons: await groups.listSeasons(id, req.userId!) })
  }),
)

// One past (or current) game's full record. Members.
groupsRouter.get(
  '/:id/seasons/:seasonId',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const seasonId = parseIdParam(req.params.seasonId)
    res.json(await groups.getSeasonDetail(id, req.userId!, seasonId))
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

groupsRouter.post(
  '/:id/members/:userId/reset-password',
  requireGroupAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const targetUserId = parseIdParam(req.params.userId)
    const temporaryPassword = await groups.adminResetPassword(id, targetUserId)
    res.json({ temporaryPassword })
  }),
)
