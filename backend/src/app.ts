import express, { type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env, maintenanceMode } from './config/env'
import { logger } from './lib/logger'
import { healthRouter } from './features/health/health.routes'
import { isMaintenanceOn } from './features/admin/maintenance'
import v1Router from './api/v1'
import { errorHandler, notFoundHandler } from './lib/middleware/error'

// The whole-site "server error" response. Sent for every API call while maintenance
// is on; the frontend turns a 503 into a full-screen offline page.
function respondUnavailable(res: Response): void {
  res.status(503).json({
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Sunucuya şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
    },
  })
}

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
  // Kept alive even during maintenance so the host doesn't mark the service dead
  // and restart-loop it.
  app.use('/health', healthRouter)

  // Maintenance kill switch. The site can be taken down two ways: the MAINTENANCE_MODE
  // env var (a hard host-level override, read once at boot) or the runtime app_flags
  // 'maintenance' flag (flipped with one DB write, no redeploy). When either is on,
  // every /api/v1 request answers 503 and the frontend shows a full-screen "server
  // error" page. Data is untouched — clear the var/flag to restore. /health above is
  // left alive so the host won't mark the service dead and restart-loop it.
  if (maintenanceMode) {
    logger.warn('MAINTENANCE_MODE env is ON — all /api/v1 requests will return 503')
  }
  app.use('/api/v1', (_req, res, next) => {
    if (maintenanceMode) return respondUnavailable(res)
    isMaintenanceOn()
      .then((on) => (on ? respondUnavailable(res) : next()))
      .catch(() => next())
  })

  app.use('/api/v1', v1Router)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
