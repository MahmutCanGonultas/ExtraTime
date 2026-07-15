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
