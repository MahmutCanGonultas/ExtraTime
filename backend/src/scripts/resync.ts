import { getPool } from '../db/pool'
import { logger } from '../lib/logger'
import {
  deactivateEndedTournaments,
  syncFixtures,
  syncLiveScores,
  syncTopAssists,
  syncTopScorers,
} from '../features/football/sync/jobs'

// One-off: refresh the data touched by the new columns (player photos, live
// minute, goal scorers) so the enriched UI has something to show immediately.
async function main() {
  logger.info('topscorers: %o', await syncTopScorers())
  logger.info('topassists: %o', await syncTopAssists())
  logger.info('fixtures: %o', await syncFixtures())
  logger.info('live: %o', await syncLiveScores())
  logger.info('retired tournaments: %d', await deactivateEndedTournaments())
  await getPool()?.end()
}

main().catch((err) => {
  logger.error({ err }, 'resync failed')
  process.exit(1)
})
