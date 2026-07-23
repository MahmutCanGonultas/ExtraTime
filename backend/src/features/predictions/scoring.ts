// The scoring rule, isolated as a pure function so it is trivial to unit test.
//
// The primary pick is the match OUTCOME (1X2). A correct call counts the same
// whether the match was decisive or a draw — reading a draw right is just as good
// as reading a winner right. Adding an exact score is a gamble: nail it and you
// score the most, miss it and you are docked a point versus just picking the
// outcome — so a score prediction has to be worth the risk.
//   exact score                              -> 5
//   correct outcome, no score predicted      -> 3
//   correct outcome, score predicted & wrong -> 2   (3 - 1 penalty)
//   wrong outcome                            -> 0

export interface ScoreLine {
  home: number
  away: number
}

export type MatchOutcome = 'HOME' | 'DRAW' | 'AWAY'

export interface Prediction {
  outcome: MatchOutcome
  // Optional exact score. Null when the member only picked the outcome.
  home: number | null
  away: number | null
}

export function outcomeOf(score: ScoreLine): MatchOutcome {
  if (score.home > score.away) return 'HOME'
  if (score.home < score.away) return 'AWAY'
  return 'DRAW'
}

export const POINTS_EXACT = 5
export const POINTS_OUTCOME = 3
export const POINTS_WRONG = 0
// Predicting an exact score but missing it costs a point versus a bare outcome pick.
export const SCORE_MISS_PENALTY = 1

export function calculatePoints(prediction: Prediction, actual: ScoreLine): number {
  const gaveScore = prediction.home !== null && prediction.away !== null

  // Exact scoreline (only reachable when a score was actually predicted).
  if (gaveScore && prediction.home === actual.home && prediction.away === actual.away) {
    return POINTS_EXACT
  }
  // Correct outcome — a draw counts the same as a decisive result. Having committed
  // to a score and missed it, though, costs a point (floored at 0).
  if (prediction.outcome === outcomeOf(actual)) {
    return gaveScore ? Math.max(POINTS_WRONG, POINTS_OUTCOME - SCORE_MISS_PENALTY) : POINTS_OUTCOME
  }
  return POINTS_WRONG
}
