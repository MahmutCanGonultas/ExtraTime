import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { AppError } from '../../lib/errors'
import {
  changePassword,
  getUserById,
  isPlatformAdmin,
  loginUser,
  registerUser,
  updateProfile,
} from './auth.service'
import { requireAuth } from './requireAuth'

export const authRouter = Router()

// Throttle auth endpoints to blunt brute-force and signup abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(50),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body)
    const result = await registerUser(body.email, body.password, body.displayName)
    res.status(201).json(result)
  }),
)

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body)
    res.json(await loginUser(body.email, body.password))
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.userId!)
    if (!user) throw AppError.unauthorized('User no longer exists')
    res.json({ user, isPlatformAdmin: isPlatformAdmin(user) })
  }),
)

// Both fields optional so this one endpoint handles renaming and avatar-picking;
// avatar is a short preset id (or null to clear). At least one must be present.
const updateProfileSchema = z
  .object({
    displayName: z.string().min(2).max(50).optional(),
    avatar: z.string().max(40).nullable().optional(),
  })
  .refine((v) => v.displayName !== undefined || v.avatar !== undefined, {
    message: 'No changes provided',
  })
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

// Change display name and/or avatar.
authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const changes = updateProfileSchema.parse(req.body)
    const user = await updateProfile(req.userId!, changes)
    res.json({ user, isPlatformAdmin: isPlatformAdmin(user) })
  }),
)

// Change password (verifies the current one).
authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body)
    await changePassword(req.userId!, body.currentPassword, body.newPassword)
    res.status(204).send()
  }),
)
