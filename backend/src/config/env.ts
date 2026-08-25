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
    // Requests/minute the API plan allows. The client spaces requests to stay
    // under this and avoid HTTP 429. The free plan allows 10/min, but setting 10
    // here means aiming exactly at the ceiling — and the deployed app and a local
    // script (or the cron and the external trigger) can be spending it at the same
    // time, which is how a catch-up sweep lost seven of its ten days to a 429.
    // Default to 8 and leave the headroom.
    API_FOOTBALL_RPM: z.coerce.number().int().positive().default(8),
    // Requests/DAY the plan allows — the hard ceiling the client refuses to
    // cross (free = 100, Pro = 7500; resets ~00:00 UTC). Keep a little headroom
    // for calls made outside the app, like `npm run check:api`, which the API
    // counts but our own counter never sees.
    API_FOOTBALL_DAILY_LIMIT: z.coerce.number().int().positive().default(7500),

    // Compute league tables and scorer leaderboards from the results we store,
    // instead of fetching them.
    //
    // Turn this ON only when the plan cannot serve `standings` / `topscorers`
    // for the current season — that is the FREE plan, which answers those with
    // "Free plans do not have access to this season". On a paid plan leave it
    // OFF: the fetched table knows about point deductions and head-to-head
    // tie-breaks that a rebuild cannot, and letting the rebuild run alongside it
    // silently degrades the real thing (it already destroyed the 2025 tables
    // once, on 2026-08-24).
    DERIVE_FROM_RESULTS: z
      .string()
      .default('')
      .transform((v) => ['1', 'true', 'on', 'yes'].includes(v.toLowerCase())),

    SYNC_SECRET: z.string().min(1).optional(),

    // Comma-separated emails that are platform admins (the app owner). They can
    // run syncs and view sync health from the /admin panel with their login.
    ADMIN_EMAILS: z.string().default(''),

    CORS_ORIGIN: z.string().default('*'),

    // Kill switch. Set MAINTENANCE_MODE=1 (or true/on) on the host and every API
    // call answers 503; the frontend turns that into a full-screen "server error"
    // page. Delete the variable to bring the site back. Nothing is destroyed —
    // predictions, scores and data all sit untouched while it's on.
    MAINTENANCE_MODE: z.string().optional(),

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
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

// The owner's maintenance kill switch, resolved once at boot. Only explicit truthy
// spellings enable it — so a leftover "0"/"false" doesn't accidentally take the
// site down. Flip by setting/removing MAINTENANCE_MODE on the host (a restart
// re-reads it).
export const maintenanceMode = ['1', 'true', 'on', 'yes'].includes(
  (env.MAINTENANCE_MODE ?? '').toLowerCase(),
)

// Reflecting every origin is only safe here because auth is a Bearer token (not a
// cookie), but it's still a hardening gap — warn loudly in prod so the owner sets
// an explicit allowlist. Not fatal, so an already-deployed backend keeps serving.
if (env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*') {
  console.warn(
    '[security] CORS_ORIGIN is "*" in production — set it to your frontend origin(s) (e.g. https://extra-time-two.vercel.app).',
  )
}

export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
export const isDevelopment = env.NODE_ENV === 'development'
