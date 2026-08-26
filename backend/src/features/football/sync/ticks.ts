import { logger } from '../../../lib/logger'
import { isRestrictedPlan, shouldDeriveTables } from '../../../lib/api-football/plan'
import {
  backfillGoalsFromEvents,
  syncStandings,
  syncTopAssists,
  syncTopScorers,
  rebuildScorerLists,
  rebuildStandings,
  refreshCurrentSquads,
  syncFixtures,
  syncMatchEvents,
  syncMissedFixtures,
  syncRecentMatchDetails,
  syncScheduleWindow,
  syncStandingsForRecentMatches,
  type SyncResult,
} from './jobs'
import { settleFinishedFixtures, syncResultsAndSettle } from '../../predictions/settle'

/**
 * What one scheduled tick actually does, in one place.
 *
 * Every sync runs from BOTH node-cron and an HTTP endpoint, because the free host
 * sleeps and an external cron has to wake it. Defining each tick twice — once in
 * scheduler.ts, once in the workflow's job list — is how the two drift apart and
 * one of them ends up calling something expensive or something that no longer
 * exists. The scheduler and the admin routes both call these.
 *
 * Each tick asks isRestrictedPlan() rather than assuming: the subscription lapses
 * and comes back, and when it does the app has to change strategy on its own.
 */

/** Scores → settle → league tables. The load-bearing one; runs hourly. */
export async function hourlyTick(): Promise<Record<string, unknown>> {
  const results = await syncResultsAndSettle()
  // Two different questions: can we still FETCH a table (isRestrictedPlan), and
  // should we REPLACE the stored one with a computed table (shouldDeriveTables).
  // A suspended paid account answers yes to the first and no to the second — it
  // must stop spending, but it must not rewrite the official numbers.
  const derive = await shouldDeriveTables()
  // Hourly, only the leagues that have just finished a match — a table cannot move
  // otherwise, and re-reading all fifty every hour would be fifty requests an hour
  // to learn nothing. The full sweep happens once a day in dailyListsTick.
  const standings = derive
    ? await rebuildStandings()
    : await syncStandingsForRecentMatches(12, 6)
  return { restricted: await isRestrictedPlan(), derive, results, standings }
}

/**
 * Matches whose result was never recorded. Restricted-plan only: on a paid plan
 * the nightly full-season sweep already re-reads every fixture.
 */
export async function backlogTick(): Promise<Record<string, unknown>> {
  if (!(await isRestrictedPlan())) return { restricted: false, skipped: 'paid plan sweeps nightly' }
  const filled = await syncMissedFixtures()
  if (filled.records === 0) return { restricted: true, filled }
  const settled = await settleFinishedFixtures()
  const standings = (await shouldDeriveTables())
    ? await rebuildStandings()
    : await syncStandingsForRecentMatches()
  return { restricted: true, filled, settled, standings }
}

/**
 * Who scored. A paid plan takes the whole match summary (events AND statistics);
 * a restricted one takes events only, bounded, then recomputes the leaderboards
 * from them because `players/topscorers` is refused for the current season.
 */
export async function detailTick(): Promise<Record<string, unknown>> {
  const restricted = await isRestrictedPlan()
  let detail: SyncResult
  if (restricted) detail = await syncMatchEvents()
  else detail = await syncRecentMatchDetails(30)
  // Safety net: an event feed written without its goal rows beside it. A no-op
  // (one indexed query) when there is nothing to derive.
  const goals = await backfillGoalsFromEvents()
  const scorers = (await shouldDeriveTables()) ? await rebuildScorerLists() : null
  return { restricted, detail, goals, scorers }
}

/**
 * The schedule. A paid plan re-reads every league's whole season, so a fixture
 * moved months ahead is known at once; a restricted one can only see yesterday
 * and tomorrow, which is the entire window that plan serves.
 */
export async function scheduleTick(): Promise<Record<string, unknown>> {
  const restricted = await isRestrictedPlan()
  const fixtures = restricted ? await syncScheduleWindow() : await syncFixtures(false)
  return { restricted, fixtures }
}

/**
 * Scorer/assist leaderboards and squads (so transfers show up). Paid-only: on a
 * restricted plan the leaderboards come from detailTick and a squad refresh costs
 * a request per team for something nobody is waiting on.
 */
export async function dailyListsTick(): Promise<Record<string, unknown>> {
  if (!(await isRestrictedPlan())) {
    // Once a day, EVERY active league-season — not the handful that happened to
    // play in the last day and a half. The per-league caps this used to obey
    // (eight tables, three scorer lists) were sized for a hundred requests a day;
    // on a paid plan the whole sweep is about a hundred and fifty of seven and a
    // half thousand, and it is the difference between a table that is always right
    // and one that is right for the leagues that played on Saturday.
    const standings = await syncStandings(false)
    const scorers = await syncTopScorers(false)
    const assists = await syncTopAssists(false)
    const squads = await refreshCurrentSquads()
    return { restricted: false, standings, scorers, assists, squads }
  }
  logger.info({ tick: 'daily-lists' }, 'Restricted plan — leaderboards are rebuilt hourly instead')
  return { restricted: true, skipped: 'derived hourly' }
}
