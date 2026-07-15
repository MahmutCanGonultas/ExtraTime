import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { asyncHandler } from '../../lib/middleware/async'
import { AppError } from '../../lib/errors'
import { getUserById, loginUser, registerUser } from './auth.service'
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
    res.json({ user })
  }),
)
