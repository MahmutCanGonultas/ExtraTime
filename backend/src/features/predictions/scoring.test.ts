import { describe, it, expect } from 'vitest'
import { calculatePoints, outcomeOf } from './scoring'

describe('calculatePoints', () => {
  it('exact score scores 3', () => {
    expect(calculatePoints({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(3)
  })

  it('exact 0-0 draw scores 3', () => {
    expect(calculatePoints({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(3)
  })

  it('correct home win but wrong score scores 1', () => {
    expect(calculatePoints({ home: 3, away: 1 }, { home: 2, away: 1 })).toBe(1)
  })

  it('correct draw but wrong score scores 1', () => {
    expect(calculatePoints({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(1)
  })

  it('wrong outcome scores 0', () => {
    expect(calculatePoints({ home: 2, away: 1 }, { home: 1, away: 2 })).toBe(0)
  })

  it('predicted draw, actual home win scores 0', () => {
    expect(calculatePoints({ home: 1, away: 1 }, { home: 2, away: 1 })).toBe(0)
  })
})

describe('outcomeOf', () => {
  it('detects home, away and draw', () => {
    expect(outcomeOf({ home: 2, away: 0 })).toBe('HOME')
    expect(outcomeOf({ home: 0, away: 2 })).toBe('AWAY')
    expect(outcomeOf({ home: 1, away: 1 })).toBe('DRAW')
  })
})
