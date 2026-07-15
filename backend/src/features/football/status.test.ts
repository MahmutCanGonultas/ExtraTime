import { describe, it, expect } from 'vitest'
import { categorizeStatus, isFinal, isScheduled } from './status'

describe('categorizeStatus', () => {
  it('maps scheduled codes', () => {
    expect(categorizeStatus('NS')).toBe('SCHEDULED')
    expect(categorizeStatus('TBD')).toBe('SCHEDULED')
  })

  it('maps finished codes', () => {
    expect(categorizeStatus('FT')).toBe('FINISHED')
    expect(categorizeStatus('AET')).toBe('FINISHED')
    expect(categorizeStatus('PEN')).toBe('FINISHED')
  })

  it('maps live, postponed and cancelled', () => {
    expect(categorizeStatus('1H')).toBe('LIVE')
    expect(categorizeStatus('HT')).toBe('LIVE')
    expect(categorizeStatus('PST')).toBe('POSTPONED')
    expect(categorizeStatus('CANC')).toBe('CANCELLED')
  })

  it('falls back to UNKNOWN for unrecognized codes', () => {
    expect(categorizeStatus('ZZZ')).toBe('UNKNOWN')
  })
})

describe('isFinal / isScheduled', () => {
  it('isFinal is true only for FT/AET/PEN', () => {
    expect(isFinal('FT')).toBe(true)
    expect(isFinal('AET')).toBe(true)
    expect(isFinal('1H')).toBe(false)
    expect(isFinal('PST')).toBe(false)
  })

  it('isScheduled is true only for NS/TBD', () => {
    expect(isScheduled('NS')).toBe(true)
    expect(isScheduled('FT')).toBe(false)
  })
})
