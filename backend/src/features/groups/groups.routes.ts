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
