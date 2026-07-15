import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { env } from '../config/env'
import { logger } from '../lib/logger'

const isLocal = (url: string) => url.includes('localhost') || url.includes('127.0.0.1')

function createPoolFromEnv(): Pool | null {
  if (!env.DATABASE_URL) return null
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Managed Postgres (Neon) requires SSL; a local Postgres usually doesn't.
    ssl: isLocal(env.DATABASE_URL) ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle Postgres client')
  })
  return pool
}

// The active pool is created from DATABASE_URL when present, so the app can
// still boot (and serve /health with db:false) without a database. Tests may
// inject an in-memory pool via setPoolForTesting.
let activePool: Pool | null = createPoolFromEnv()

export function getPool(): Pool | null {
  return activePool
}

export function setPoolForTesting(pool: Pool | null): void {
  activePool = pool
}

/**
 * Single entry point for SQL. Feature code never imports `pg` directly.
 * Always pass values as parameters ($1, $2, ...) — never concatenate into SQL.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (!activePool) throw new Error('DATABASE_URL is not configured; database is unavailable')
  return activePool.query<T>(text, params)
}

/** Connectivity probe used by GET /health. Never throws. */
export async function ping(): Promise<boolean> {
  if (!activePool) return false
  try {
    await activePool.query('SELECT 1')
    return true
  } catch (err) {
    logger.error({ err }, 'Database ping failed')
    return false
  }
}
