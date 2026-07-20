import { describe, it, expect } from 'vitest'
import { compareStandings } from './leaderboard'

// The one ranking rule shared by the season, weekly and live tables: most points,
// then most exact scores, then fewest wrong, then name (Turkish collation).
function rank<T extends { points: number; exactCount: number; wrongCount: number; displayName: string }>(
  entries: T[],
): string[] {
  return [...entries].sort(compareStandings).map((e) => e.displayName)
}

describe('compareStandings tie-break', () => {
  const base = { points: 0, exactCount: 0, wrongCount: 0, displayName: '' }

  it('orders by points descending', () => {
    expect(
      rank([
        { ...base, displayName: 'A', points: 5 },
        { ...base, displayName: 'B', points: 9 },
        { ...base, displayName: 'C', points: 7 },
      ]),
    ).toEqual(['B', 'C', 'A'])
  })

  it('breaks equal points by more exact scores', () => {
    expect(
      rank([
        { ...base, displayName: 'A', points: 10, exactCount: 1 },
        { ...base, displayName: 'B', points: 10, exactCount: 3 },
      ]),
    ).toEqual(['B', 'A'])
  })

  it('breaks equal points + exact by fewest wrong', () => {
    expect(
      rank([
        { ...base, displayName: 'A', points: 10, exactCount: 2, wrongCount: 4 },
        { ...base, displayName: 'B', points: 10, exactCount: 2, wrongCount: 1 },
      ]),
    ).toEqual(['B', 'A'])
  })

  it('falls back to name (Turkish collation) on a full tie', () => {
    expect(
      rank([
        { ...base, displayName: 'Çınar', points: 6 },
        { ...base, displayName: 'Ahmet', points: 6 },
        { ...base, displayName: 'Zeynep', points: 6 },
      ]),
    ).toEqual(['Ahmet', 'Çınar', 'Zeynep'])
  })

  it('is a stable, transitive comparator across all keys', () => {
    const entries = [
      { points: 8, exactCount: 1, wrongCount: 2, displayName: 'B' },
      { points: 8, exactCount: 1, wrongCount: 2, displayName: 'A' },
      { points: 8, exactCount: 2, wrongCount: 0, displayName: 'C' },
      { points: 12, exactCount: 0, wrongCount: 5, displayName: 'D' },
    ]
    expect(rank(entries)).toEqual(['D', 'C', 'A', 'B'])
  })
})
