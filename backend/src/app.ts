import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env'
import { logger } from './lib/logger'
import { healthRouter } from './features/health/health.routes'
import v1Router from './api/v1'
import { errorHandler, notFoundHandler } from './lib/middleware/error'

export function createApp() {
  const app = express()

  // Behind Render's single reverse proxy: trust one hop so req.ip is the real
  // client IP (otherwise the auth rate-limiter buckets every user together).
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(helmet())
  // Auth is a Bearer JWT in the Authorization header — never a cookie — so CORS does
  // NOT need credentials. Dropping credentials removes the "reflect any origin WITH
  // credentials" risk: even when CORS_ORIGIN is '*' (reflecting the caller's origin),
  // a cross-site page can't ride a user's session because it can't read the token
  // from the user's same-origin localStorage. Set CORS_ORIGIN to a real allowlist in
  // production to lock it down further.
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  )
  app.use(express.json())
  app.use(pinoHttp({ logger }))

  // Health lives outside /api/v1 so pingers and the platform hit a stable path.
  app.use('/health', healthRouter)

  app.use('/api/v1', v1Router)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
