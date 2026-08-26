import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { query } from '../../db/pool'
import { AppError } from '../../lib/errors'
import { asyncHandler } from '../../lib/middleware/async'
import { parseIdParam } from '../../lib/params'
import { requireSyncAccess } from './sync.middleware'
import * as groups from '../groups/groups.service'
import * as admin from './admin.service'
import * as predictions from '../predictions/predictions.service'
import {
  backfillAllSeasons,
  refreshCurrentSquads,
  seedLeaguesJob,
  syncFixtures,
  backfillGoalsFromEvents,
  rebuildScorerLists,
  rebuildStandings,
  syncMissedFixtures,
  syncPlanStatus,
  syncLiveScores,
  syncMatchEvents,
  syncScheduleWindow,
  syncStaleLiveFixtures,
  syncStandings,
  syncStandingsForRecentMatches,
  syncTopAssists,
  syncTopAssistsForRecentMatches,
  syncTopScorers,
  syncTopScorersForRecentMatches,
} from '../football/sync/jobs'
import { getBudget } from '../../lib/api-football/client'
import { getPlanState } from '../../lib/api-football/plan'
import { backfillJob } from '../football/sync/backfill'
import {
  backlogTick,
  dailyListsTick,
  detailTick,
  hourlyTick,
  scheduleTick,
} from '../football/sync/ticks'
import { settleFinishedFixtures, settleFixture, syncResultsAndSettle } from '../predictions/settle'

export const adminRouter = Router()

// Every admin route requires the sync secret OR a platform-admin login.
adminRouter.use(requireSyncAccess)

// Moderation actions must be performed by a logged-in platform admin (so we know
// WHO did it) — the shared sync secret alone is not enough.
function requireAdminUser(req: { userId?: number }): number {
  if (!req.userId) throw AppError.forbidden('Bu işlem için platform-admin girişi gerekir')
  return req.userId
}

// Middleware form of the above, for READ routes that expose user/group data. The
// shared SYNC_SECRET (handed to external cron triggers) must NOT be able to read
// PII — only a real platform-admin JWT (which sets req.userId) may. Sync-TRIGGER
// routes keep the broader requireSyncAccess gate.
const adminOnly: RequestHandler = (req, _res, next) => {
  requireAdminUser(req)
  next()
}

const adjustmentSchema = z.object({
  userId: z.number().int().positive(),
  delta: z.number().int().min(-1000).max(1000),
  reason: z.string().max(200).optional(),
})
const addFixtureSchema = z.object({ fixtureId: z.number().int().positive() })
const userPatchSchema = z
  .object({
    displayName: z.string().trim().min(2).max(50).optional(),
    email: z.string().trim().email().max(120).optional(),
  })
  .refine((b) => b.displayName != null || b.email != null, { message: 'Değişiklik yok' })
const setAdminSchema = z.object({ isAdmin: z.boolean() })
const userSearchSchema = z.object({ search: z.string().trim().max(60).optional() })
const renameGroupSchema = z.object({ name: z.string().trim().min(2).max(60) })
const transferSchema = z.object({ email: z.string().email().max(120) })
const addMemberSchema = z.object({ email: z.string().email().max(120) })
const adminPredictionSchema = z
  .object({
    userId: z.number().int().positive(),
    fixtureId: z.number().int().positive(),
    outcome: z.enum(['HOME', 'DRAW', 'AWAY']),
    predictedHome: z.number().int().min(0).max(99).nullable().optional(),
    predictedAway: z.number().int().min(0).max(99).nullable().optional(),
  })
  .refine((b) => (b.predictedHome == null) === (b.predictedAway == null), {
    message: 'Skor girecekseniz her iki takım için de girin',
  })

// --- Platform-admin group moderation: step into any group ---
adminRouter.get(
  '/groups',
  adminOnly,
  asyncHandler(async (_req, res) => res.json({ groups: await groups.adminListGroups() })),
)
adminRouter.get(
  '/groups/:id',
  adminOnly,
  asyncHandler(async (req, res) => res.json(await groups.adminGroupOverview(parseIdParam(req.params.id)))),
)
// Platform-admin moderation operates on the group's newest active game.
async function requireActiveGameId(groupId: number): Promise<number> {
  const game = await groups.getActiveSeason(groupId)
  if (!game) throw AppError.badRequest('Grupta açık oyun yok')
  return game.id
}
adminRouter.get(
  '/groups/:id/candidate-fixtures',
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id)
    const { q } = z.object({ q: z.string().trim().max(80).optional() }).parse(req.query)
    res.json({
      fixtures: await groups.getCandidateFixtures(id, await requireActiveGameId(id), q),
    })
  }),
)
adminRouter.post(
  '/groups/:id/fixtures',
  asyncHandler(async (req, res) => {
    const adminId = requireAdminUser(req)
    const id = parseIdParam(req.params.id)
    const { fixtureId } = addFixtureSchema.parse(req.body)
    await groups.addGroupFixture(id, await requireActiveGameId(id), fixtureId, adminId)
    res.status(201).json({ ok: true })
  }),
)
adminRouter.delete(
  '/groups/:id/fixtures/:fixtureId',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const id = parseIdParam(req.params.id)
    await groups.removeGroupFixture(
      id,
      await requireActiveGameId(id),
      parseIdParam(req.params.fixtureId),
      req.userId!,
    )
    res.status(204).send()
  }),
)
adminRouter.post(
  '/groups/:id/adjustments',
  asyncHandler(async (req, res) => {
    const adminId = requireAdminUser(req)
    const body = adjustmentSchema.parse(req.body)
    await groups.addPointAdjustment(
      parseIdParam(req.params.id),
      body.userId,
      body.delta,
      body.reason ?? null,
      adminId,
    )
    res.status(201).json({ ok: true })
  }),
)
adminRouter.delete(
  '/groups/:id/members/:userId',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await groups.adminRemoveMember(parseIdParam(req.params.id), parseIdParam(req.params.userId))
    res.status(204).send()
  }),
)
adminRouter.post(
  '/groups/:id/members/:userId/reset-password',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const temporaryPassword = await groups.adminResetPassword(
      parseIdParam(req.params.id),
      parseIdParam(req.params.userId),
    )
    res.json({ temporaryPassword })
  }),
)

// Every member's prediction for a match (bypasses the pre-lock privacy screen).
adminRouter.get(
  '/groups/:id/fixtures/:fixtureId/predictions',
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({
      predictions: await predictions.adminFixturePredictions(
        parseIdParam(req.params.id),
        parseIdParam(req.params.fixtureId),
      ),
    })
  }),
)

// Override any member's prediction (the only way a prediction can change).
adminRouter.post(
  '/groups/:id/predictions',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const b = adminPredictionSchema.parse(req.body)
    await predictions.adminSetPrediction(
      parseIdParam(req.params.id),
      b.userId,
      b.fixtureId,
      b.outcome,
      b.predictedHome ?? null,
      b.predictedAway ?? null,
    )
    res.status(201).json({ ok: true })
  }),
)

// Correct a match result by hand and re-settle every prediction on it. Global (a
// fixture is shared by all groups). Unlike the dev simulator this keeps the real
// kickoff_at — it only fixes the score/status. Platform-admin JWT required.
const fixtureResultSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  status: z.enum(['FT', 'AET', 'PEN']).default('FT'),
})
adminRouter.post(
  '/fixtures/:id/result',
  adminOnly,
  asyncHandler(async (req, res) => {
    const fixtureId = parseIdParam(req.params.id)
    const { homeScore, awayScore, status } = fixtureResultSchema.parse(req.body)
    const { rowCount } = await query(
      `UPDATE fixtures
          SET status = $2, home_score = $3, away_score = $4, updated_at = now()
        WHERE id = $1`,
      [fixtureId, status, homeScore, awayScore],
    )
    if ((rowCount ?? 0) === 0) throw AppError.notFound('Maç bulunamadı')
    const settled = await settleFixture(fixtureId)
    res.json({ ok: true, settled })
  }),
)

// --- Platform overview ---
adminRouter.get(
  '/stats',
  adminOnly,
  asyncHandler(async (_req, res) => res.json(await admin.adminStats())),
)

// --- User management ---
adminRouter.get(
  '/users',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { search } = userSearchSchema.parse(req.query)
    res.json({ users: await admin.adminListUsers(search ?? '') })
  }),
)
adminRouter.get(
  '/users/:id',
  adminOnly,
  asyncHandler(async (req, res) => res.json(await admin.adminUserDetail(parseIdParam(req.params.id)))),
)
adminRouter.post(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const temporaryPassword = await admin.adminResetUserPassword(parseIdParam(req.params.id))
    res.json({ temporaryPassword })
  }),
)
adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await admin.adminUpdateUser(parseIdParam(req.params.id), userPatchSchema.parse(req.body))
    res.json({ ok: true })
  }),
)
adminRouter.post(
  '/users/:id/admin',
  asyncHandler(async (req, res) => {
    const actingAdminId = requireAdminUser(req)
    const { isAdmin } = setAdminSchema.parse(req.body)
    await admin.adminSetUserAdmin(parseIdParam(req.params.id), isAdmin, actingAdminId)
    res.json({ ok: true })
  }),
)
adminRouter.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const actingAdminId = requireAdminUser(req)
    await admin.adminDeleteUser(parseIdParam(req.params.id), actingAdminId)
    res.status(204).send()
  }),
)

// --- Group management (list + rename/transfer/invite/add-member/delete) ---
adminRouter.get(
  '/all-groups',
  adminOnly,
  asyncHandler(async (_req, res) => res.json({ groups: await admin.adminListAllGroups() })),
)
adminRouter.patch(
  '/groups/:id',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await admin.adminRenameGroup(parseIdParam(req.params.id), renameGroupSchema.parse(req.body).name)
    res.json({ ok: true })
  }),
)
adminRouter.delete(
  '/groups/:id',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await admin.adminDeleteGroup(parseIdParam(req.params.id))
    res.status(204).send()
  }),
)
adminRouter.post(
  '/groups/:id/transfer',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await admin.adminTransferGroup(parseIdParam(req.params.id), transferSchema.parse(req.body).email)
    res.json({ ok: true })
  }),
)
adminRouter.post(
  '/groups/:id/regenerate-invite',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    const inviteCode = await admin.adminRegenerateInvite(parseIdParam(req.params.id))
    res.json({ inviteCode })
  }),
)
adminRouter.post(
  '/groups/:id/add-member',
  asyncHandler(async (req, res) => {
    requireAdminUser(req)
    await admin.adminAddMemberByEmail(parseIdParam(req.params.id), addMemberSchema.parse(req.body).email)
    res.status(201).json({ ok: true })
  }),
)

adminRouter.post(
  '/sync/seed',
  asyncHandler(async (_req, res) => res.json(await seedLeaguesJob())),
)

// One-time historical load across all seasons (seed + fixtures + standings + scorers).
adminRouter.post(
  '/sync/backfill',
  asyncHandler(async (_req, res) => res.json({ results: await backfillAllSeasons() })),
)
// --- The scheduled ticks, exactly as node-cron runs them ---------------------
// These call the SAME functions as the internal cron (features/football/sync/
// ticks.ts), so the external trigger and the internal one cannot drift apart.
// Each one adapts to the current plan on its own.
const TICKS = {
  hourly: hourlyTick,
  backlog: backlogTick,
  detail: detailTick,
  schedule: scheduleTick,
  'daily-lists': dailyListsTick,
} as const

const tickParam = z.object({ name: z.enum(['hourly', 'backlog', 'detail', 'schedule', 'daily-lists']) })

adminRouter.post(
  '/sync/tick/:name',
  asyncHandler(async (req, res) => {
    const { name } = tickParam.parse(req.params)
    res.json(await TICKS[name]())
  }),
)

// Fill in what was never fetched: match detail, player rosters, past-season
// tables, team venues. Paid-plan only, and it leaves a floor for the scores.
adminRouter.post(
  '/sync/backfill',
  asyncHandler(async (req, res) => {
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(5000).optional() }).parse(req.query)
    res.json(await backfillJob(limit))
  }),
)

// Probe the plan and record what it allows. One request; run it after changing
// subscription so the app switches strategy without waiting for the daily check.
adminRouter.post(
  '/sync/plan',
  asyncHandler(async (_req, res) => res.json(await syncPlanStatus())),
)

// Settle only — pure DB work, ZERO API requests. This is what the frequent
// external trigger calls: it turns an already-synced full-time score into
// points, weekly champions and standings without touching API-Football.
adminRouter.post(
  '/sync/settle',
  asyncHandler(async (_req, res) => res.json({ settled: await settleFinishedFixtures() })),
)

// --- The cheap jobs the cron runs (a handful of requests each) ---------------
adminRouter.post(
  '/sync/schedule',
  asyncHandler(async (_req, res) => res.json(await syncScheduleWindow())),
)
// A per-run cap the caller may lower but not raise past sanity. Zod, not
// Number.isFinite: a fractional or absurd limit would flow straight into a
// LIMIT clause and a request-per-item loop.
const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).optional() })

adminRouter.post(
  '/sync/match-events',
  asyncHandler(async (req, res) => {
    const { limit } = limitQuery.parse(req.query)
    res.json(await syncMatchEvents(limit))
  }),
)

// Derive the goal list from event feeds already stored. Zero API requests.
adminRouter.post(
  '/sync/goals-from-events',
  asyncHandler(async (_req, res) => res.json(await backfillGoalsFromEvents())),
)

// Scorer + assist leaderboards recomputed from stored goals. Zero API requests,
// and the only way to have current ones — players/topscorers is season-gated.
adminRouter.post(
  '/sync/scorers-derived',
  asyncHandler(async (_req, res) => res.json(await rebuildScorerLists())),
)
// League tables recomputed from the results we already store. ZERO API requests,
// and the only way to have a current table on the free plan — see rebuildStandings.
adminRouter.post(
  '/sync/standings-derived',
  asyncHandler(async (req, res) => {
    // ?includeFinished=1 also rebuilds seasons that are already over. Normally we
    // leave those alone — their table was fetched from the API while the
    // subscription was live and knows about point deductions a rebuild cannot —
    // so use it only to repair a season a previous rebuild damaged.
    const includeFinished = req.query.includeFinished === '1'
    res.json(await rebuildStandings(includeFinished))
  }),
)

// Drain the backlog of matches whose result was never recorded. One request per
// fixture (the free plan refuses the batched `ids` parameter), so pass ?limit=
// deliberately — it will not spend below the reserve the scores need.
adminRouter.post(
  '/sync/missed',
  asyncHandler(async (req, res) => {
    const { limit } = limitQuery.parse(req.query)
    res.json(await syncMissedFixtures(limit))
  }),
)

// NOTE: the three routes below ask the API for a league+season, which the FREE
// plan refuses for the current season ("Free plans do not have access to this
// season"). They are kept for the day the subscription comes back; today they
// spend ~50 requests and return nothing.
adminRouter.post(
  '/sync/standings-recent',
  asyncHandler(async (_req, res) => res.json(await syncStandingsForRecentMatches())),
)
adminRouter.post(
  '/sync/topscorers-recent',
  asyncHandler(async (_req, res) => res.json(await syncTopScorersForRecentMatches())),
)
adminRouter.post(
  '/sync/topassists-recent',
  asyncHandler(async (_req, res) => res.json(await syncTopAssistsForRecentMatches())),
)

// --- Expensive per-league sweeps: one request PER league-season (~50 of them),
// AND season-gated on the free plan, so today they cost ~50 requests to return
// zero rows. Off the cron entirely; kept for a future paid plan and for the past
// seasons (2022-2024) the free plan does still serve.
adminRouter.post(
  '/sync/fixtures',
  asyncHandler(async (_req, res) => res.json(await syncFixtures())),
)
adminRouter.post(
  '/sync/results',
  asyncHandler(async (_req, res) => res.json(await syncResultsAndSettle())),
)
adminRouter.post(
  '/sync/stale-live',
  asyncHandler(async (_req, res) => res.json(await syncStaleLiveFixtures())),
)

adminRouter.post(
  '/sync/live',
  asyncHandler(async (_req, res) => {
    // Refresh live group scores AND settle anything that just finished, so an
    // external trigger (GitHub Actions) both updates and settles in one call.
    const live = await syncLiveScores()
    const settled = await settleFinishedFixtures()
    res.json({ ...live, settled })
  }),
)
adminRouter.post(
  '/sync/squads',
  asyncHandler(async (_req, res) => res.json(await refreshCurrentSquads())),
)
adminRouter.post(
  '/sync/standings',
  asyncHandler(async (_req, res) => res.json(await syncStandings())),
)
adminRouter.post(
  '/sync/topscorers',
  asyncHandler(async (_req, res) => res.json(await syncTopScorers())),
)
adminRouter.post(
  '/sync/topassists',
  asyncHandler(async (_req, res) => res.json(await syncTopAssists())),
)

// Today's API spend against the plan's daily ceiling, plus the per-job
// breakdown — the number to look at before triggering anything by hand.
adminRouter.get(
  '/sync/budget',
  asyncHandler(async (_req, res) => {
    const [budget, plan] = await Promise.all([getBudget(), getPlanState()])
    const { rows } = await query(
      `SELECT job_name, SUM(api_requests_used)::int AS requests, COUNT(*)::int AS runs
       FROM sync_logs
       WHERE ran_at >= (date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc')
       GROUP BY job_name
       ORDER BY requests DESC`,
    )
    res.json({ ...budget, plan, byJob: rows })
  }),
)

// Latest run per job, for the admin sync-health screen.
adminRouter.get(
  '/sync/status',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT DISTINCT ON (job_name)
         job_name, ran_at, records_upserted, api_requests_used, success, error_message
       FROM sync_logs
       ORDER BY job_name, ran_at DESC`,
    )
    res.json({ jobs: rows })
  }),
)
