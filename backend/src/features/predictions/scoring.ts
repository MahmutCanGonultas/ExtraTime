// The scoring rule, isolated as a pure function so it is trivial to unit test
// and easy to extend later. Exact score = 3, correct result only = 1, else 0.

export interface ScoreLine {
  home: number
  away: number
}

export type MatchOutcome = 'HOME' | 'DRAW' | 'AWAY'

export function outcomeOf(score: ScoreLine): MatchOutcome {
  if (score.home > score.away) return 'HOME'
  if (score.home < score.away) return 'AWAY'
  return 'DRAW'
}

export const POINTS_EXACT = 3
export const POINTS_CORRECT_OUTCOME = 1
export const POINTS_WRONG = 0

export function calculatePoints(prediction: ScoreLine, actual: ScoreLine): number {
  if (prediction.home === actual.home && prediction.away === actual.away) {
    return POINTS_EXACT
  }
  if (outcomeOf(prediction) === outcomeOf(actual)) {
    return POINTS_CORRECT_OUTCOME
  }
  return POINTS_WRONG
}
