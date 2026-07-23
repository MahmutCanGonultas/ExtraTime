import { query } from '../../db/pool'
import { logger } from '../../lib/logger'

// The runtime maintenance flag lives in app_flags so the site can be taken down / put
// back instantly with a single DB write — no redeploy, no code change, and the on/off
// state never shows up in the repo. Read here behind a 10s cache: at most one tiny
// query every 10s under load, while a fresh toggle still takes effect within 10s.
//
// Fails SAFE: any DB error leaves the site UP. We never black out the whole app just
// because the database had a transient hiccup.
let cached = false
let checkedAt = 0
const TTL_MS = 10_000

export async function isMaintenanceOn(): Promise<boolean> {
  const now = Date.now()
  if (now - checkedAt < TTL_MS) return cached
  checkedAt = now
  try {
    const { rows } = await query<{ value: string }>(
      `SELECT value FROM app_flags WHERE key = 'maintenance'`,
    )
    cached = rows[0]?.value === 'on'
  } catch (err) {
    logger.error({ err }, 'maintenance flag read failed — assuming site is UP')
    cached = false
  }
  return cached
}
