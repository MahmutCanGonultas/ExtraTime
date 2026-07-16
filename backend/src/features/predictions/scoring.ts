// The scoring rule, isolated as a pure function so it is trivial to unit test.
//
// The primary pick is the match OUTCOME (1X2). Adding an exact score is a gamble:
// nail it and you score the most, miss it and you are docked a point versus just
// picking the winner — so a score prediction has to be worth the risk.
//   exact score                              -> 5
//   correct winner, no score predicted       -> 3
//   correct winner, score predicted & wrong  -> 2   (3 - 1 penalty)
//   correct draw,   no score predicted       -> 1
//   correct draw,   score predicted & wrong  -> 0   (1 - 1 penalty)
//   wrong outcome                            -> 0

export interface ScoreLine {
  home: number
  away: number
}

export type MatchOutcome = 'HOME' | 'DRAW' | 'AWAY'

export interface Prediction {
  outcome: MatchOutcome
  // Optional exact score. Null when the member only picked the winner.
  home: number | null
  away: number | null
}

export function outcomeOf(score: ScoreLine): MatchOutcome {
  if (score.home > score.away) return 'HOME'
  if (score.home < score.away) return 'AWAY'
  return 'DRAW'
}

export const POINTS_EXACT = 5
export const POINTS_WINNER = 3
export const POINTS_DRAW = 1
export const POINTS_WRONG = 0
// Predicting an exact score but missing it costs a point versus a bare outcome pick.
export const SCORE_MISS_PENALTY = 1

export function calculatePoints(prediction: Prediction, actual: ScoreLine): number {
  const gaveScore = prediction.home !== null && prediction.away !== null

  // Exact scoreline (only reachable when a score was actually predicted).
  if (gaveScore && prediction.home === actual.home && prediction.away === actual.away) {
    return POINTS_EXACT
  }
  // Correct outcome — a decisive result is worth more than a shared draw. Having
  // committed to a score and missed it, though, costs a point (floored at 0).
  if (prediction.outcome === outcomeOf(actual)) {
    const base = outcomeOf(actual) === 'DRAW' ? POINTS_DRAW : POINTS_WINNER
    return gaveScore ? Math.max(POINTS_WRONG, base - SCORE_MISS_PENALTY) : base
  }
  return POINTS_WRONG
}
