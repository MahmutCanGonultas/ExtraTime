import cron from 'node-cron'
import { logger } from '../../../lib/logger'
import { syncFixtures, syncStandings, syncTopAssists, syncTopScorers } from './jobs'
import { syncResultsAndSettle } from '../../predictions/settle'

// Internal cron. On free hosting the process may sleep, so the same jobs are
// also reachable over HTTP (dual trigger) and woken by an external cron.
// Schedules use the server timezone — set TZ on the host if it isn't UTC.
export function startScheduler(): void {
  // Fixtures: twice a day.
  cron.schedule('0 6,18 * * *', () => void syncFixtures())

  // Standings, scorers, assists: once a day, staggered a few minutes apart.
  cron.schedule('30 6 * * *', () => void syncStandings())
  cron.schedule('45 6 * * *', () => void syncTopScorers())
  cron.schedule('50 6 * * *', () => void syncTopAssists())

  // Results: hourly through the evening match window (sync then settle).
  cron.schedule('5 18-23 * * *', () => void syncResultsAndSettle())

  logger.info('Cron scheduler started')
}
