import { describe, it, expect } from 'vitest'
import { isLocked } from './lock'

describe('isLocked', () => {
  const kickoff = new Date('2030-01-01T18:00:00Z')

  it('is open one second before kickoff', () => {
    expect(isLocked(kickoff, new Date('2030-01-01T17:59:59Z'))).toBe(false)
  })

  it('locks exactly at kickoff', () => {
    expect(isLocked(kickoff, new Date('2030-01-01T18:00:00Z'))).toBe(true)
  })

  it('is locked after kickoff', () => {
    expect(isLocked(kickoff, new Date('2030-01-01T18:00:01Z'))).toBe(true)
  })

  it('compares in UTC regardless of the local offset of the inputs', () => {
    // Same instant expressed with an offset — still exactly kickoff, so locked.
    expect(isLocked(kickoff, new Date('2030-01-01T21:00:00+03:00'))).toBe(true)
  })
})
