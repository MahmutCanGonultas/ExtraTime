import { describe, it, expect } from 'vitest'
import { calculatePoints, outcomeOf, type Prediction } from './scoring'

// Helper: a prediction with an exact score. Its outcome is derived from the score.
function withScore(home: number, away: number): Prediction {
  return { outcome: outcomeOf({ home, away }), home, away }
}
// Helper: an outcome-only prediction (no score entered).
function outcomeOnly(outcome: Prediction['outcome']): Prediction {
  return { outcome, home: null, away: null }
}

describe('calculatePoints', () => {
  it('exact score scores 5', () => {
    expect(calculatePoints(withScore(2, 1), { home: 2, away: 1 })).toBe(5)
  })

  it('exact 0-0 draw scores 5', () => {
    expect(calculatePoints(withScore(0, 0), { home: 0, away: 0 })).toBe(5)
  })

  it('correct winner but wrong predicted score scores 2 (3 - 1 penalty)', () => {
    // Predicted 5-3 (home win), match ends 2-1 (home win): winner right, score
    // missed, so 3 - 1 = 2.
    expect(calculatePoints(withScore(5, 3), { home: 2, away: 1 })).toBe(2)
    expect(calculatePoints(withScore(3, 1), { home: 2, away: 1 })).toBe(2)
  })

  it('correct draw but wrong predicted score scores 2 (3 - 1 penalty)', () => {
    // Predicted 1-1 (a draw), match ends 2-2 (a draw): outcome right, score missed,
    // so 3 - 1 = 2 — same treatment as a missed-score winner.
    expect(calculatePoints(withScore(1, 1), { home: 2, away: 2 })).toBe(2)
    expect(calculatePoints(withScore(0, 0), { home: 1, away: 1 })).toBe(2)
  })

  it('outcome-only correct winner scores 3', () => {
    expect(calculatePoints(outcomeOnly('HOME'), { home: 2, away: 0 })).toBe(3)
  })

  it('outcome-only correct draw scores 3 (same as a winner)', () => {
    expect(calculatePoints(outcomeOnly('DRAW'), { home: 1, away: 1 })).toBe(3)
    expect(calculatePoints(outcomeOnly('DRAW'), { home: 0, away: 0 })).toBe(3)
  })

  it('wrong outcome scores 0', () => {
    expect(calculatePoints(withScore(2, 1), { home: 1, away: 2 })).toBe(0)
  })

  it('predicted draw, actual home win scores 0', () => {
    expect(calculatePoints(outcomeOnly('DRAW'), { home: 2, away: 1 })).toBe(0)
  })
})

describe('outcomeOf', () => {
  it('detects home, away and draw', () => {
    expect(outcomeOf({ home: 2, away: 0 })).toBe('HOME')
    expect(outcomeOf({ home: 0, away: 2 })).toBe('AWAY')
    expect(outcomeOf({ home: 1, away: 1 })).toBe('DRAW')
  })
})
