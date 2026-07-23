import cron from 'node-cron'
import { logger } from '../../../lib/logger'
import {
  refreshCurrentSquads,
  syncFixtures,
  syncLiveScores,
  syncRecentMatchDetails,
  syncStaleLiveFixtures,
  syncStandings,
  syncTopAssists,
  syncTopScorers,
} from './jobs'
import { settleFinishedFixtures, syncResultsAndSettle } from '../../predictions/settle'

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

  // Hourly safety net: unstick any fixture frozen in a live status long after
  // kickoff (suspended/abandoned matches, or ones that finished after the UTC day
  // rolled over). Costs zero API requests when nothing is stuck.
  cron.schedule('10 * * * *', () => void syncStaleLiveFixtures())

  // Every minute: refresh live GROUP-match scores, then settle any match that has
  // just finished so points + standings + weekly champions update automatically,
  // without anyone triggering it. syncLiveScores no-ops (zero API cost) when no
  // group match is in progress; settleFinishedFixtures is DB-only and idempotent.
  cron.schedule('* * * * *', async () => {
    await syncLiveScores()
    await settleFinishedFixtures()
  })

  logger.info('Cron scheduler started')
}
