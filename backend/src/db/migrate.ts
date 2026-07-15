import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PoolClient } from 'pg'
import { getPool } from './pool'
import { logger } from '../lib/logger'

const MIGRATIONS_DIR = join(__dirname, 'migrations')

// Records which .sql files have already run, so re-running `npm run migrate`
// only applies new ones. This is what makes migrations idempotent.
async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function getApplied(client: PoolClient): Promise<Set<string>> {
  const { rows } = await client.query<{ filename: string }>('SELECT filename FROM schema_migrations')
  return new Set(rows.map((r) => r.filename))
}

async function run(): Promise<void> {
  const pool = getPool()
  if (!pool) {
    logger.error('DATABASE_URL is not set; cannot run migrations')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    await ensureMigrationsTable(client)
    const applied = await getApplied(client)

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    const pending = files.filter((f) => !applied.has(f))

    if (pending.length === 0) {
      logger.info('No pending migrations')
      return
    }

    for (const file of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      logger.info(`Applying migration: ${file}`)
      // Each migration runs in its own transaction: it either fully applies
      // and gets recorded, or rolls back entirely.
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        logger.error({ err, file }, 'Migration failed; rolled back')
        throw err
      }
    }

    logger.info(`Applied ${pending.length} migration(s)`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  logger.error({ err }, 'Migration run failed')
  process.exit(1)
})
