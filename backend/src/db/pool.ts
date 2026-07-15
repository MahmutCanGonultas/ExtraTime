import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { env } from '../config/env'
import { logger } from '../lib/logger'

const isLocal = (url: string) => url.includes('localhost') || url.includes('127.0.0.1')

// The pool is created only when DATABASE_URL is set, so the app can still boot
// (and serve /health with db:false) in environments without a database.
export const pool: Pool | null = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      // Managed Postgres (Neon) requires SSL; a local Postgres usually doesn't.
      ssl: isLocal(env.DATABASE_URL) ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null

if (pool) {
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle Postgres client')
  })
}

/**
 * Single entry point for SQL. Feature code never imports `pg` directly.
 * Always pass values as parameters ($1, $2, ...) — never concatenate into SQL.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (!pool) throw new Error('DATABASE_URL is not configured; database is unavailable')
  return pool.query<T>(text, params)
}

/** Connectivity probe used by GET /health. Never throws. */
export async function ping(): Promise<boolean> {
  if (!pool) return false
  try {
    await pool.query('SELECT 1')
    return true
  } catch (err) {
    logger.error({ err }, 'Database ping failed')
    return false
  }
}
