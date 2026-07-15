// The scoring rule, isolated as a pure function so it is trivial to unit test.
//
// The primary pick is the match OUTCOME (1X2). The exact score is optional and,
// when given and correct, scores the most:
//   exact score            -> 5
//   correct decisive winner -> 3
//   correct draw            -> 1
//   wrong outcome           -> 0

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

export function calculatePoints(prediction: Prediction, actual: ScoreLine): number {
  // Exact scoreline (only reachable when a score was actually predicted).
  if (
    prediction.home !== null &&
    prediction.away !== null &&
    prediction.home === actual.home &&
    prediction.away === actual.away
  ) {
    return POINTS_EXACT
  }
  // Correct outcome — a decisive result is worth more than a shared draw.
  if (prediction.outcome === outcomeOf(actual)) {
    return outcomeOf(actual) === 'DRAW' ? POINTS_DRAW : POINTS_WINNER
  }
  return POINTS_WRONG
}
