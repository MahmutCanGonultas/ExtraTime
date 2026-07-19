import cron from 'node-cron'
import { logger } from '../../../lib/logger'
import {
  refreshCurrentSquads,
  syncFixtures,
  syncLiveScores,
  syncRecentMatchDetails,
  syncStandings,
  syncTopAssists,
  syncTopScorers,
} from './jobs'
import { syncResultsAndSettle } from '../../predictions/settle'

// Internal cron. On free hosting the process may sleep, so the same jobs are
// also reachable over HTTP (dual trigger) and woken by an external cron.
// Schedules use the server timezone — set TZ on the host if it isn't UTC.
export function startScheduler(): void {
  // Fixtures: twice a day.
  cron.schedule('0 6,18 * * *', () => void syncFixtures())

  // Squads: once a day, so transfers (new club, shirt number) show up — matters
  // during the transfer window. Runs early, before the standings/scorer sync.
  cron.schedule('0 4 * * *', () => void refreshCurrentSquads())

  // Standings, scorers, assists: once a day, staggered a few minutes apart.
  cron.schedule('30 6 * * *', () => void syncStandings())
  cron.schedule('45 6 * * *', () => void syncTopScorers())
  cron.schedule('50 6 * * *', () => void syncTopAssists())

  // Results: hourly through the evening match window (sync then settle).
  cron.schedule('5 18-23 * * *', () => void syncResultsAndSettle())

  // Detailed summaries: enrich newly-finished matches shortly after results, a
  // bounded batch each run so it stays within budget.
  cron.schedule('20 18-23 * * *', () => void syncRecentMatchDetails())

  // Live scores: every minute, so group predictions tick over quickly during a
  // match. syncLiveScores no-ops (zero API cost) when nothing is in progress —
  // cheap off match days — and an in-flight guard stops a slow run overlapping.
  cron.schedule('* * * * *', () => void syncLiveScores())

  logger.info('Cron scheduler started')
}
