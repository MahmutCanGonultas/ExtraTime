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
  updateDisplayName,
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

const updateNameSchema = z.object({ displayName: z.string().min(2).max(50) })
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

// Change display name.
authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { displayName } = updateNameSchema.parse(req.body)
    const user = await updateDisplayName(req.userId!, displayName)
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
