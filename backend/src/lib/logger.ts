import pino from 'pino'
import { env, isDevelopment } from '../config/env'

/**
 * Single structured logger for the whole app. In development it pretty-prints
 * with colors; in production it emits JSON lines that log platforms can index.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  // Never write credentials to the logs. pino-http logs the whole request under
  // `req`, so strip the Authorization JWT, the sync secret and any cookies.
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-sync-secret"]', 'req.headers.cookie'],
    remove: true,
  },
  transport: isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
})
