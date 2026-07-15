import pino from 'pino'
import { env, isDevelopment } from '../config/env'

/**
 * Single structured logger for the whole app. In development it pretty-prints
 * with colors; in production it emits JSON lines that log platforms can index.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
})
