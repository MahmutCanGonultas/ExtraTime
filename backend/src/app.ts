import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env'
import { logger } from './lib/logger'
import { healthRouter } from './features/health/health.routes'
import { errorHandler, notFoundHandler } from './lib/middleware/error'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(pinoHttp({ logger }))

  // Health lives outside /api/v1 so pingers and the platform hit a stable path.
  app.use('/health', healthRouter)

  // Feature routers mount under /api/v1 as they land (auth, football, groups, predictions).

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
