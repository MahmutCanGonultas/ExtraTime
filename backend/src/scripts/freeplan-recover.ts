import { getPool } from '../db/pool'
import { getBudget } from '../lib/api-football/client'
import { logger } from '../lib/logger'
import {
  backfillGoalsFromEvents,
  rebuildScorerLists,
  rebuildStandings,
  syncMissedFixtures,
  syncMatchEvents,
} from '../features/football/sync/jobs'
import { settleFinishedFixtures } from '../features/predictions/settle'

/**
 * One-off recovery after the API-Football plan lapsed to Free.
 *
 * Two things had gone wrong and neither was visible: the per-league results job
 * was spending ~50 requests an hour to be refused by the plan (an empty response
 * plus an error object reads as a successful sync), and `fixture_goals` had never
 * been filled from the event feeds that syncFixtureDetail was already storing.
 *
 * Ordering matters — each step reads what the one before it wrote:
 *   1. goals from stored events   0 requests
 *   2. missed results             1 request per fixture, bounded
 *   3. settle                     0 requests
 *   4. league tables              0 requests, from the results of step 2
 *   5. scorer leaderboards        0 requests, from the goals of steps 1 and 6
 *   6. goal detail for new matches, bounded by whatever budget is left
 *   7. scorer leaderboards again, now including step 6
 *
 * Step 2 is one request per FIXTURE, not per day: the free plan serves the `date`
 * filter only for yesterday..tomorrow and refuses the batched `ids` parameter
 * entirely, so a backlog can only be drained a match at a time.
 *
 * Usage:  npx tsx src/scripts/freeplan-recover.ts [missedFixtures] [eventFixtures]
 */
async function main(): Promise<void> {
  const missed = Number(process.argv[2] ?? 20)
  const events = Number(process.argv[3] ?? 20)

  logger.info({ budget: await getBudget() }, 'Starting recovery')

  logger.info({ step: 1, result: await backfillGoalsFromEvents() }, 'Goals derived from stored events')
  logger.info({ step: 2, result: await syncMissedFixtures(missed) }, 'Missed results filled in')
  logger.info({ step: 3, settled: await settleFinishedFixtures() }, 'Predictions settled')
  logger.info({ step: 4, result: await rebuildStandings() }, 'League tables rebuilt')
  logger.info({ step: 5, result: await rebuildScorerLists() }, 'Scorer lists rebuilt')
  logger.info({ step: 6, result: await syncMatchEvents(events) }, 'Goal detail fetched')
  logger.info({ step: 7, result: await rebuildScorerLists() }, 'Scorer lists rebuilt with new goals')

  logger.info({ budget: await getBudget() }, 'Recovery finished')
  await getPool()?.end()
}

main().catch((err) => {
  logger.error({ err }, 'freeplan-recover failed')
  process.exit(1)
})
