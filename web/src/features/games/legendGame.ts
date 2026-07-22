import { allLegends, legendClubKeys, sharedClubs, type Legend } from './legends'

// Deterministic per-day puzzles from the curated legends dataset — fully
// client-side, no API. Same date → same puzzle for everyone.

function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// club key (lowercase) → display name, first seen wins.
function clubDisplayIndex(): Map<string, string> {
  const m = new Map<string, string>()
  for (const l of allLegends())
    for (const c of l.clubs) {
      const k = c.name.toLowerCase()
      if (!m.has(k)) m.set(k, c.name)
    }
  return m
}

// ── Kariyer Zinciri (Efsaneler): two legends who shared a club ──────────────
export interface LegendPairQuestion {
  a: Legend
  b: Legend
  options: string[] // club display names; exactly one is shared
}

export function legendPairQuiz(date: string, n = 8): LegendPairQuestion[] {
  const legends = allLegends().filter((l) => l.clubs.length >= 3)
  const rnd = seededRng(`lz-pair#${date}`)
  const display = clubDisplayIndex()

  // club key → legends that played there
  const byClub = new Map<string, Legend[]>()
  for (const l of legends)
    for (const k of legendClubKeys(l)) {
      const arr = byClub.get(k)
      if (arr) arr.push(l)
      else byClub.set(k, [l])
    }
  const sharedKeys = [...byClub.entries()].filter(([, ls]) => ls.length >= 2).map(([k]) => k)

  const used = new Set<string>()
  const out: LegendPairQuestion[] = []
  for (const key of shuffle(sharedKeys, rnd)) {
    if (out.length >= n) break
    const pool = shuffle(byClub.get(key)!, rnd)
    let a: Legend | null = null
    let b: Legend | null = null
    for (const l of pool) {
      if (used.has(l.name)) continue
      if (!a) a = l
      else if (l.name !== a.name) {
        b = l
        break
      }
    }
    if (!a || !b) continue
    const shared = new Set(sharedClubs(a, b).map((c) => c.toLowerCase()))
    // decoys: clubs only one of them played for
    const xor: string[] = []
    for (const c of [...a.clubs, ...b.clubs]) {
      const k = c.name.toLowerCase()
      if (!shared.has(k) && !xor.includes(k)) xor.push(k)
    }
    if (xor.length < 3) continue
    const correct = display.get(key)!
    const decoys = shuffle(xor, rnd)
      .slice(0, 3)
      .map((k) => display.get(k)!)
    used.add(a.name)
    used.add(b.name)
    out.push({ a, b, options: shuffle([correct, ...decoys], rnd) })
  }
  return out
}

// Which options a pair actually shares (for client-side validation + reveal).
export function pairSharedSet(a: Legend, b: Legend): Set<string> {
  return new Set(sharedClubs(a, b).map((c) => c.toLowerCase()))
}

// ── Kariyer Kimin? — guess the legend from their club career ─────────────────
export interface LegendWhoQuestion {
  legend: Legend
  options: string[] // 4 legend names, one correct
}

export function legendWhoQuiz(date: string, n = 10): LegendWhoQuestion[] {
  const legends = allLegends().filter((l) => l.clubs.length >= 3)
  const rnd = seededRng(`lz-who#${date}`)
  const picked = shuffle(legends, rnd).slice(0, n)
  const out: LegendWhoQuestion[] = []
  for (const legend of picked) {
    // Decoys prefer the same country (more plausible), then anyone.
    const sameCountry = legends.filter((l) => l.country === legend.country && l.name !== legend.name)
    const others = legends.filter((l) => l.country !== legend.country)
    const decoyPool = [...shuffle(sameCountry, rnd), ...shuffle(others, rnd)]
    const decoys: string[] = []
    for (const d of decoyPool) {
      if (decoys.length >= 3) break
      if (d.name !== legend.name && !decoys.includes(d.name)) decoys.push(d.name)
    }
    if (decoys.length < 3) continue
    out.push({ legend, options: shuffle([legend.name, ...decoys], rnd) })
  }
  return out
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}
