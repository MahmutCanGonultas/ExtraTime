import { createApp } from './app'
import { env, isTest } from './config/env'
import { logger } from './lib/logger'
import { getPool } from './db/pool'
import { startScheduler } from './features/football/sync/scheduler'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT} (env: ${env.NODE_ENV})`)
  // Internal cron runs only with a database and never during tests.
  if (!isTest && getPool()) {
    startScheduler()
  }
})

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutting down')
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Unattended-operation safety net. A stray rejected promise (e.g. a cron job
// whose promise wasn't awaited, or a transient API/DB blip) must NOT take the
// whole server down — log it and keep serving. A truly uncaught exception leaves
// the process in an undefined state, so we log and exit; the platform restarts it.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection — kept alive')
})
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting for a clean restart')
  server.close(() => process.exit(1))
  // Force-exit if close() hangs, so the platform can restart promptly.
  setTimeout(() => process.exit(1), 3000).unref()
})
