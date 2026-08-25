import cron from 'node-cron'
import { logger } from '../../../lib/logger'
import { syncPlanStatus, syncStaleLiveFixtures } from './jobs'
import { backlogTick, dailyListsTick, detailTick, hourlyTick, scheduleTick } from './ticks'
import { settleFinishedFixtures } from '../../predictions/settle'

// Internal cron. On free hosting the process may sleep, so the same jobs are also
// reachable over HTTP (dual trigger) and woken by an external cron
// (.github/workflows/sync.yml). Schedules use the server timezone: set TZ on the
// host if it isn't UTC.
//
// WHAT each tick does lives in ticks.ts, which the HTTP routes call too — so the
// two triggers cannot drift apart. This file only decides WHEN.
//
// ── TWO PLANS, ONE SCHEDULE ────────────────────────────────────────────────
// The subscription lapses and comes back, so nothing here assumes which plan is
// live. Each tick asks isRestrictedPlan(), which reads what the daily /status
// probe recorded — so when Pro expires the app degrades on its own, with no
// redeploy and without anyone having to notice.
//
//   PAID (Pro: 7500/day)              RESTRICTED (Free: 100/day)
//   ──────────────────────            ──────────────────────────
//   results   date=today   1/run      results   date=today   1/run
//   standings fetched      ~8/day     standings DERIVED      0
//   scorers   fetched      ~6/day     scorers   DERIVED      0
//   fixtures  full season  ~51/day    schedule  ±1 day       2/day
//   details   events+stats ~60/day    events    bounded      <=4/run
//   squads                 20/day     missed    bounded      <=4/run
//   ────────────────────────────      ──────────────────────────────
//   ~250/day of 7500                  ~25/day of 100
//
// Live scores are off on BOTH plans: a deliberate product choice, not a budget
// one. Scores refresh hourly and settling is DB-only.
export function startScheduler(): void {
  // Know the plan before spending anything on it, then re-check daily.
  void syncPlanStatus()
  cron.schedule('0 3 * * *', () => void syncPlanStatus())

  const run = (name: string, tick: () => Promise<unknown>) => () => {
    // Guard every tick: a failure must never leave the cron callback as an
    // unhandled rejection, because the loop runs forever.
    void tick().catch((err: unknown) => {
      logger.error({ err, tick: name }, 'Scheduled tick failed — will retry on the next run')
    })
  }

  cron.schedule('5 11-23 * * *', run('hourly', hourlyTick))
  cron.schedule('20 11-23 * * *', run('backlog', backlogTick))
  cron.schedule('35 11-23 * * *', run('detail', detailTick))
  cron.schedule('0 4 * * *', run('schedule', scheduleTick))
  cron.schedule('40 4 * * *', run('daily-lists', dailyListsTick))

  // Unstick any fixture frozen in a live status long after kickoff (suspended or
  // abandoned matches). Free when nothing is stuck.
  cron.schedule('20 5 * * *', run('stale-live', syncStaleLiveFixtures))

  // Every 5 minutes: settle any match just marked final. Pure DB work, zero API
  // cost — the hourly tick writes the score, this turns it into points and weekly
  // champions without anyone triggering it.
  cron.schedule('*/5 * * * *', run('settle', settleFinishedFixtures))

  logger.info('Cron scheduler started (plan-aware; degrades to the free-plan strategy on its own)')
}
