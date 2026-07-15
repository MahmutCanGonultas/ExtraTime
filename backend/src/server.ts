import { createApp } from './app'
import { env } from './config/env'
import { logger } from './lib/logger'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT} (env: ${env.NODE_ENV})`)
})

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutting down')
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
