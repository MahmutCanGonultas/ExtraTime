import { query } from '../../db/pool'
import { isFinal } from '../football/status'
import { deactivateEndedTournaments, syncResults } from '../football/sync/jobs'
import { calculatePoints } from './scoring'

/**
 * Score every prediction for one fixture. Idempotent: it recomputes points from
 * the current score each time, so if a score is later corrected, re-running this
 * simply overwrites the old points (re-settle). Returns how many predictions it
 * scored. Settles ONLY when the match is truly final with a score.
 */
export async function settleFixture(fixtureId: number): Promise<number> {
  const { rows } = await query<{ status: string; home_score: number | null; away_score: number | null }>(
    `SELECT status, home_score, away_score FROM fixtures WHERE id = $1`,
    [fixtureId],
  )
  const fixture = rows[0]
  if (!fixture || !isFinal(fixture.status) || fixture.home_score === null || fixture.away_score === null) {
    return 0
  }

  const actual = { home: fixture.home_score, away: fixture.away_score }
  const preds = await query<{
    id: number
    user_id: number
    group_id: number
    predicted_outcome: 'HOME' | 'DRAW' | 'AWAY'
    predicted_home: number | null
    predicted_away: number | null
  }>(
    `SELECT id, user_id, group_id, predicted_outcome, predicted_home, predicted_away
     FROM predictions WHERE fixture_id = $1`,
    [fixtureId],
  )

  // Who has this match as their joker (2x points) — keyed by group+user.
  const jokers = await query<{ user_id: number; group_id: number }>(
    `SELECT DISTINCT sj.user_id, gf.group_id
     FROM season_jokers sj
     JOIN group_fixtures gf ON gf.season_id = sj.season_id AND gf.fixture_id = sj.fixture_id
     WHERE sj.fixture_id = $1`,
    [fixtureId],
  )
  const jokerSet = new Set(jokers.rows.map((j) => `${j.group_id}:${j.user_id}`))

  let scored = 0
  for (const p of preds.rows) {
    const base = calculatePoints(
      { outcome: p.predicted_outcome, home: p.predicted_home, away: p.predicted_away },
      actual,
    )
    const points = jokerSet.has(`${p.group_id}:${p.user_id}`) ? base * 2 : base
    await query(`UPDATE predictions SET points_awarded = $1, settled_at = now() WHERE id = $2`, [
      points,
      p.id,
    ])
    scored += 1
  }
  return scored
}

/**
 * Settle every final fixture that has predictions still needing it — either
 * never settled, or the fixture was updated after it was last settled (a score
 * correction). This is what the results sync calls.
 */
export async function settleFinishedFixtures(): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `SELECT DISTINCT p.fixture_id AS id
     FROM predictions p JOIN fixtures f ON f.id = p.fixture_id
     WHERE f.status IN ('FT','AET','PEN') AND f.home_score IS NOT NULL
       AND (p.settled_at IS NULL OR f.updated_at > p.settled_at)`,
  )
  let total = 0
  for (const row of rows) {
    total += await settleFixture(row.id)
  }
  return total
}

/** Results sync + settle in one call — used by the cron job and the admin endpoint. */
export async function syncResultsAndSettle() {
  const sync = await syncResults()
  const settled = await settleFinishedFixtures()
  // Retire any tournament that just played its last match (drops off the home page).
  const retired = await deactivateEndedTournaments()
  return { ...sync, settled, retired }
}
