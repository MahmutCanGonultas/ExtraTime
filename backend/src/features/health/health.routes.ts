import { Router } from 'express'
import { ping } from '../../db/pool'

export const healthRouter = Router()

// Health check for uptime pingers and the deploy platform.
// No auth, and it never touches API-Football.
healthRouter.get('/', async (_req, res) => {
  const db = await ping()
  res.status(200).json({ status: 'ok', db })
})
