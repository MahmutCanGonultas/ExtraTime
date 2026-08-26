import cron from 'node-cron'
import { logger } from '../../../lib/logger'
import { syncPlanStatus, syncStaleLiveFixtures } from './jobs'
import { backfillJob } from './backfill'
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
// The free-plan day, added up (it is the tighter of the two and the one that has
// already gone wrong once). Effective ceiling 95 — five held back because our
// counter cannot see requests made outside the app:
//
//   scores            26   one per run, and a run happens TWICE an hour: this
//                          file and .github/workflows/sync.yml both fire
//   schedule sweep     2   yesterday and tomorrow
//   stale-live        <=5  free unless a fixture is stuck
//   plan probe         1
//   ─────────────────────
//   carried            34  <- what EVENTS_BUDGET_FLOOR / MISSED_BUDGET_FLOOR (45)
//                          exist to protect
//   goal detail       <=50 bounded, stops at the floor
//   backlog           <=50 bounded, stops at the same floor
//   ─────────────────────
//   ~84 of 95. The two bounded jobs share whatever is above the floor.
//
//   PAID (Pro: 7500/day)              RESTRICTED (Free: 100/day)
//   ──────────────────────            ──────────────────────────
//   results   date=today   1/run      results   date=today   1/run
//   standings fetched      ~8/day     standings DERIVED      0
//   scorers   fetched      ~6/day     scorers   DERIVED      0
//   fixtures  full season  ~51/day    schedule  ±1 day       2/day
//   details   events+stats ~60/day    events    bounded      <=4/run
//   squads                 20/day     missed    bounded      <=4/run
//   backfill  <=500/run    (paid)     backfill  disabled
//   ────────────────────────────      ──────────────────────────────
//   ~250/day + backfill of 7500       ~25/day of 100
//
// The backfill is the one job that would spend the whole allowance if it could,
// so it holds a 1000-request floor back. Everything it fetches is PERMANENT —
// stored in Postgres and served cache-first — which is why it is worth spending a
// paid month on, and why nothing is lost when the plan drops.
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

  // Ten to: fill in what the app never fetched — match detail, player rosters,
  // past-season tables, team venues. Only worth doing while the plan is paid, and
  // it stops with 1000 requests still on the clock so the scores are never
  // starved. A no-op on the restricted plan; what it collected simply stays.
  cron.schedule('50 11-23 * * *', run('backfill', backfillJob))

  // Unstick any fixture frozen in a live status long after kickoff (suspended or
  // abandoned matches). Free when nothing is stuck.
  cron.schedule('20 5 * * *', run('stale-live', syncStaleLiveFixtures))

  // Every 5 minutes: settle any match just marked final. Pure DB work, zero API
  // cost — the hourly tick writes the score, this turns it into points and weekly
  // champions without anyone triggering it.
  cron.schedule('*/5 * * * *', run('settle', settleFinishedFixtures))

  logger.info('Cron scheduler started (plan-aware; degrades to the free-plan strategy on its own)')
}
