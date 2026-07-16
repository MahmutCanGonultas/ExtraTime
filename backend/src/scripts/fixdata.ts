import { getPool } from '../db/pool'
import { logger } from '../lib/logger'
import { syncLiveScores, syncStandings } from '../features/football/sync/jobs'

// One-off: refresh standings (so tournament group labels populate) and run the
// live sync (which now reconciles ended matches stuck showing as live).
async function main() {
  logger.info('standings: %o', await syncStandings())
  logger.info('live: %o', await syncLiveScores())
  await getPool()?.end()
}

main().catch((err) => {
  logger.error({ err }, 'fixdata failed')
  process.exit(1)
})
