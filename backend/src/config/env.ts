import 'dotenv/config'
import { z } from 'zod'

/**
 * Central, validated view of process.env. Nothing else in the codebase reads
 * process.env directly — everyone imports `env` from here. This gives us one
 * place where a missing/invalid variable fails loudly at startup.
 *
 * Secrets are optional at boot so the app can still start (and serve /health)
 * without a database in local/dev environments. In production they are required.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().url().optional(),

    JWT_SECRET: z.string().min(16).optional(),
    JWT_EXPIRES_IN: z.string().default('7d'),

    API_FOOTBALL_KEY: z.string().min(1).optional(),
    API_FOOTBALL_BASE_URL: z.string().url().default('https://v3.football.api-sports.io'),

    SYNC_SECRET: z.string().min(1).optional(),

    CORS_ORIGIN: z.string().default('*'),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV !== 'production') return
    const requiredInProd = ['DATABASE_URL', 'JWT_SECRET', 'API_FOOTBALL_KEY', 'SYNC_SECRET'] as const
    for (const key of requiredInProd) {
      if (!val[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when NODE_ENV=production`,
        })
      }
    }
  })

// Treat empty-string env vars (common in .env files, e.g. DATABASE_URL=) as
// unset, so optional fields fall back to their defaults instead of failing.
const cleanedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ''),
)

const parsed = envSchema.safeParse(cleanedEnv)
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
export const isDevelopment = env.NODE_ENV === 'development'
