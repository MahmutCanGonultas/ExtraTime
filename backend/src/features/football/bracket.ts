// Turns a competition's knockout fixtures into a bracket tree. Pure + tested, so
// the tricky bits — two-legged aggregate ties (Champions League), penalty
// shootouts, and ordering rounds so winners line up with their next-round tie —
// are all covered by Vitest and never touch the DB.
//
// Two formats are handled from the same data:
//   - single-leg (World Cup): one fixture = one bracket match.
//   - two-legged (Champions League): two fixtures with the same team pair are a
//     single tie whose winner is decided on aggregate goals, then penalties.

export interface BracketTeam {
  teamId: number
  apiId: number
  name: string
}

// One knockout fixture as read from the cache.
export interface BracketFixture {
  fixtureId: number
  round: string | null
  status: string
  kickoffAt: string
  home: BracketTeam
  away: BracketTeam
  homeScore: number | null
  awayScore: number | null
  penaltyHome: number | null
  penaltyAway: number | null
}

// A bracket node: a single-leg match or an aggregated two-legged tie.
export interface BracketMatch {
  key: string
  fixtureIds: number[]
  legs: number
  state: 'finished' | 'live' | 'scheduled'
  kickoffAt: string
  home: BracketTeam | null
  away: BracketTeam | null
  homeScore: number | null // aggregate for `home` when two-legged
  awayScore: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  winner: 'home' | 'away' | null
  // Keys of the previous-round matches this one's teams advanced from, so the UI
  // can draw connector lines to the exact feeder ties (empty for the first round).
  sourceKeys: string[]
}

export interface BracketRound {
  key: string
  label: string
  order: number
  matches: BracketMatch[]
}

export interface Bracket {
  hasKnockout: boolean
  twoLegged: boolean
  rounds: BracketRound[]
  thirdPlace: BracketMatch | null
  champion: BracketTeam | null
}

const FINISHED = new Set(['FT', 'AET', 'PEN'])
const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'SUSP', 'INT'])

interface RoundDef {
  test: RegExp
  key: string
  label: string
  order: number
  isThird?: boolean
}

// Only the main knockout bracket. Group/league phase and qualifying rounds are
// intentionally excluded (they are shown as standings, not a tree). Order matters:
// "3rd Place Final" must be caught before "Final".
const ROUND_DEFS: RoundDef[] = [
  { test: /knockout round play-?offs?|^play-?offs?$/i, key: 'po', label: 'Play-off Turu', order: 10 },
  { test: /round of 32|1\/16/i, key: 'r32', label: 'Son 32', order: 20 },
  { test: /round of 16|1\/8/i, key: 'r16', label: 'Son 16', order: 30 },
  { test: /quarter-?finals?|1\/4/i, key: 'qf', label: 'Çeyrek Final', order: 40 },
  { test: /semi-?finals?|1\/2/i, key: 'sf', label: 'Yarı Final', order: 50 },
  { test: /3rd place|third place/i, key: 'third', label: 'Üçüncülük', order: 55, isThird: true },
  { test: /^final\b/i, key: 'final', label: 'Final', order: 60 },
]

function classifyRound(round: string | null): RoundDef | null {
  if (!round) return null
  for (const def of ROUND_DEFS) if (def.test.test(round)) return def
  return null
}

function pairKey(a: number, b: number): string {
  return [a, b].sort((x, y) => x - y).join('-')
}

function decideSingle(f: BracketFixture): 'home' | 'away' | null {
  if (!FINISHED.has(f.status) || f.homeScore == null || f.awayScore == null) return null
  if (f.homeScore > f.awayScore) return 'home'
  if (f.awayScore > f.homeScore) return 'away'
  if (f.penaltyHome != null && f.penaltyAway != null) {
    if (f.penaltyHome > f.penaltyAway) return 'home'
    if (f.penaltyAway > f.penaltyHome) return 'away'
  }
  return null
}

function aggState(legs: BracketFixture[]): 'finished' | 'live' | 'scheduled' {
  if (legs.some((l) => LIVE.has(l.status))) return 'live'
  if (legs.every((l) => FINISHED.has(l.status))) return 'finished'
  return 'scheduled'
}

function singleLegMatch(key: string, f: BracketFixture): BracketMatch {
  const played = FINISHED.has(f.status) || LIVE.has(f.status)
  return {
    key,
    fixtureIds: [f.fixtureId],
    legs: 1,
    state: aggState([f]),
    kickoffAt: f.kickoffAt,
    home: f.home,
    away: f.away,
    homeScore: played ? f.homeScore : null,
    awayScore: played ? f.awayScore : null,
    penaltyHome: f.penaltyHome,
    penaltyAway: f.penaltyAway,
    winner: decideSingle(f),
    sourceKeys: [],
  }
}

// Combine two legs into one aggregate tie, oriented to the FIRST leg's home/away.
function twoLegMatch(key: string, legsIn: BracketFixture[]): BracketMatch {
  const legs = [...legsIn].sort(byKickoffFx)
  const homeTeam = legs[0].home
  const awayTeam = legs[0].away
  const decider = legs[legs.length - 1] // the return leg holds any shootout
  const decHomeIsCanon = decider.home.teamId === homeTeam.teamId

  let hs = 0
  let as = 0
  let anyScore = false
  for (const l of legs) {
    if (l.homeScore == null || l.awayScore == null) continue
    anyScore = true
    if (l.home.teamId === homeTeam.teamId) {
      hs += l.homeScore
      as += l.awayScore
    } else {
      hs += l.awayScore
      as += l.homeScore
    }
  }

  const pHome = decider.penaltyHome == null ? null : decHomeIsCanon ? decider.penaltyHome : decider.penaltyAway
  const pAway = decider.penaltyAway == null ? null : decHomeIsCanon ? decider.penaltyAway : decider.penaltyHome

  let winner: 'home' | 'away' | null = null
  if (aggState(legs) === 'finished' && anyScore) {
    if (hs > as) winner = 'home'
    else if (as > hs) winner = 'away'
    else if (pHome != null && pAway != null) winner = pHome > pAway ? 'home' : pAway > pHome ? 'away' : null
  }

  return {
    key,
    fixtureIds: legs.map((l) => l.fixtureId),
    legs: 2,
    state: aggState(legs),
    kickoffAt: legs[0].kickoffAt,
    home: homeTeam,
    away: awayTeam,
    homeScore: anyScore ? hs : null,
    awayScore: anyScore ? as : null,
    penaltyHome: pHome,
    penaltyAway: pAway,
    winner,
    sourceKeys: [],
  }
}

// Fixtures in one round → bracket matches. Two fixtures sharing a team pair are a
// two-legged tie; a lone fixture is single-leg.
function buildTies(fx: BracketFixture[], prefix: string): BracketMatch[] {
  const groups = new Map<string, BracketFixture[]>()
  for (const f of fx) {
    const k = pairKey(f.home.teamId, f.away.teamId)
    const g = groups.get(k) ?? []
    g.push(f)
    groups.set(k, g)
  }
  const matches: BracketMatch[] = []
  for (const [k, legs] of groups) {
    const key = `${prefix}:${k}` // globally unique so the UI can link rounds
    matches.push(legs.length === 1 ? singleLegMatch(key, legs[0]) : twoLegMatch(key, legs))
  }
  return matches
}

function winnerTeamId(m: BracketMatch): number | null {
  if (m.winner === 'home') return m.home?.teamId ?? null
  if (m.winner === 'away') return m.away?.teamId ?? null
  return null
}

function feederIndex(m: BracketMatch, idxByWinner: Map<number, number>): number {
  const idxs: number[] = []
  if (m.home && idxByWinner.has(m.home.teamId)) idxs.push(idxByWinner.get(m.home.teamId)!)
  if (m.away && idxByWinner.has(m.away.teamId)) idxs.push(idxByWinner.get(m.away.teamId)!)
  return idxs.length ? Math.min(...idxs) : Number.MAX_SAFE_INTEGER
}

function byKickoff(a: BracketMatch, b: BracketMatch): number {
  return a.kickoffAt.localeCompare(b.kickoffAt) || a.key.localeCompare(b.key)
}

function byKickoffFx(a: BracketFixture, b: BracketFixture): number {
  return a.kickoffAt.localeCompare(b.kickoffAt) || a.fixtureId - b.fixtureId
}

export function buildBracket(fixtures: BracketFixture[]): Bracket {
  const buckets = new Map<string, { def: RoundDef; fx: BracketFixture[] }>()
  for (const f of fixtures) {
    const def = classifyRound(f.round)
    if (!def) continue
    const b = buckets.get(def.key) ?? { def, fx: [] }
    b.fx.push(f)
    buckets.set(def.key, b)
  }
  if (buckets.size === 0) {
    return { hasKnockout: false, twoLegged: false, rounds: [], thirdPlace: null, champion: null }
  }

  // Two-legged if any round repeats a team pair.
  let twoLegged = false
  for (const { fx } of buckets.values()) {
    const seen = new Set<string>()
    for (const f of fx) {
      const k = pairKey(f.home.teamId, f.away.teamId)
      if (seen.has(k)) {
        twoLegged = true
        break
      }
      seen.add(k)
    }
    if (twoLegged) break
  }

  const rounds: BracketRound[] = []
  let thirdPlace: BracketMatch | null = null
  for (const { def, fx } of buckets.values()) {
    const ties = buildTies(fx, def.key)
    if (def.isThird) {
      thirdPlace = ties[0] ?? null
      continue
    }
    rounds.push({ key: def.key, label: def.label, order: def.order, matches: ties })
  }
  rounds.sort((a, b) => a.order - b.order)

  // Order each round so a tie sits next to the previous-round ties it came from,
  // giving the clean top-to-bottom bracket when the field halves each round.
  for (let i = 0; i < rounds.length; i++) {
    if (i === 0) {
      rounds[0].matches.sort(byKickoff)
      continue
    }
    const idxByWinner = new Map<number, number>()
    rounds[i - 1].matches.forEach((m, idx) => {
      const w = winnerTeamId(m)
      if (w != null) idxByWinner.set(w, idx)
    })
    rounds[i].matches.sort(
      (a, b) => feederIndex(a, idxByWinner) - feederIndex(b, idxByWinner) || byKickoff(a, b),
    )
  }

  // Link each match to the previous-round ties its two teams advanced from.
  for (let i = 1; i < rounds.length; i++) {
    const keyByWinner = new Map<number, string>()
    for (const m of rounds[i - 1].matches) {
      const w = winnerTeamId(m)
      if (w != null) keyByWinner.set(w, m.key)
    }
    for (const m of rounds[i].matches) {
      const keys = new Set<string>()
      if (m.home && keyByWinner.has(m.home.teamId)) keys.add(keyByWinner.get(m.home.teamId)!)
      if (m.away && keyByWinner.has(m.away.teamId)) keys.add(keyByWinner.get(m.away.teamId)!)
      m.sourceKeys = [...keys]
    }
  }

  const finalRound = rounds.find((r) => r.key === 'final')
  let champion: BracketTeam | null = null
  if (finalRound && finalRound.matches.length === 1) {
    const f = finalRound.matches[0]
    if (f.winner === 'home') champion = f.home
    else if (f.winner === 'away') champion = f.away
  }

  return { hasKnockout: true, twoLegged, rounds, thirdPlace, champion }
}
