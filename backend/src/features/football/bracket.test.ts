import { describe, it, expect } from 'vitest'
import { buildBracket, type BracketFixture } from './bracket'

let idc = 1
function team(id: number, name: string) {
  return { teamId: id, apiId: 1000 + id, name }
}
function fx(
  round: string,
  home: ReturnType<typeof team>,
  away: ReturnType<typeof team>,
  hs: number | null,
  as: number | null,
  opts: { status?: string; ph?: number | null; pa?: number | null; day?: number } = {},
): BracketFixture {
  return {
    fixtureId: idc++,
    round,
    status: opts.status ?? (hs == null ? 'NS' : 'FT'),
    kickoffAt: `2026-06-${String(opts.day ?? 10).padStart(2, '0')}T18:00:00.000Z`,
    home,
    away,
    homeScore: hs,
    awayScore: as,
    penaltyHome: opts.ph ?? null,
    penaltyAway: opts.pa ?? null,
  }
}

const GER = team(1, 'Germany')
const FRA = team(2, 'France')
const BRA = team(3, 'Brazil')
const ARG = team(4, 'Argentina')

describe('buildBracket — single-leg (World Cup style)', () => {
  it('orders rounds, decides winners, crowns the champion', () => {
    const fixtures = [
      // Semi-finals
      fx('Semi-finals', GER, FRA, 2, 1, { day: 12 }),
      fx('Semi-finals', BRA, ARG, 0, 1, { day: 12 }),
      // Final + 3rd place
      fx('Final', GER, ARG, 1, 0, { day: 15 }),
      fx('3rd Place Final', FRA, BRA, 3, 2, { day: 14 }),
    ]
    const b = buildBracket(fixtures)
    expect(b.hasKnockout).toBe(true)
    expect(b.twoLegged).toBe(false)
    expect(b.rounds.map((r) => r.key)).toEqual(['sf', 'final'])
    const sf = b.rounds[0]
    expect(sf.matches).toHaveLength(2)
    expect(sf.matches[0].winner).toBe('home') // GER beat FRA
    expect(sf.matches[1].winner).toBe('away') // ARG beat BRA
    expect(b.champion?.name).toBe('Germany')
    expect(b.thirdPlace?.winner).toBe('home') // FRA won 3rd place
    expect(b.thirdPlace?.home?.name).toBe('France')
  })

  it('decides a level final on penalties', () => {
    const b = buildBracket([fx('Final', GER, ARG, 1, 1, { status: 'PEN', ph: 3, pa: 4, day: 15 })])
    expect(b.champion?.name).toBe('Argentina')
    expect(b.rounds[0].matches[0].winner).toBe('away')
  })

  it('leaves champion null while the final is unplayed', () => {
    const b = buildBracket([fx('Final', GER, ARG, null, null, { status: 'NS' })])
    expect(b.champion).toBeNull()
    expect(b.rounds[0].matches[0].winner).toBeNull()
  })
})

describe('buildBracket — two-legged (Champions League style)', () => {
  it('aggregates two legs into one tie and picks the aggregate winner', () => {
    const b = buildBracket([
      fx('Round of 16', GER, FRA, 1, 2, { day: 10 }), // leg 1: FRA lead 2-1
      fx('Round of 16', FRA, GER, 0, 3, { day: 17 }), // leg 2: GER win 3-0 → agg GER 4-2
    ])
    expect(b.twoLegged).toBe(true)
    const tie = b.rounds[0].matches[0]
    expect(tie.legs).toBe(2)
    expect(tie.home?.name).toBe('Germany') // oriented to leg-1 home
    expect(tie.homeScore).toBe(4)
    expect(tie.awayScore).toBe(2)
    expect(tie.winner).toBe('home')
  })

  it('decides a level aggregate on the second-leg shootout', () => {
    const b = buildBracket([
      fx('Semi-finals', BRA, ARG, 1, 0, { day: 10 }),
      fx('Semi-finals', ARG, BRA, 1, 0, { status: 'PEN', ph: 4, pa: 2, day: 17 }), // agg 1-1; leg2 ARG home win pens 4-2
    ])
    const tie = b.rounds[0].matches[0]
    expect(tie.homeScore).toBe(1) // BRA aggregate
    expect(tie.awayScore).toBe(1)
    // decider leg: ARG (canonical away) home in leg2, wins shootout 4-2
    expect(tie.winner).toBe('away')
  })
})

describe('buildBracket — round filtering', () => {
  it('ignores group/league-phase and qualifying rounds', () => {
    const b = buildBracket([
      fx('Group Stage - 1', GER, FRA, 2, 0),
      fx('League Stage - 3', BRA, ARG, 1, 1),
      fx('2nd Qualifying Round', GER, BRA, 3, 0),
      fx('Final', GER, FRA, 1, 0, { day: 20 }),
    ])
    expect(b.rounds.map((r) => r.key)).toEqual(['final'])
    expect(b.champion?.name).toBe('Germany')
  })

  it('returns hasKnockout=false when there is no knockout data', () => {
    const b = buildBracket([fx('Group Stage - 1', GER, FRA, 2, 0)])
    expect(b.hasKnockout).toBe(false)
    expect(b.rounds).toHaveLength(0)
  })
})
