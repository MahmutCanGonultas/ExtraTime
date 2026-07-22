import { LEGENDS_RAW } from './legends.data'

// ── Futbol Efsaneleri (curated, retired-only) ───────────────────────────────
// Hand-authored dataset the sync layer never touches, so it survives any future
// API change. The raw text is grouped by "#Country" headers, one player per line
// as "Name=Club1, Club2, …". A trailing "(KL)" on the name marks a goalkeeper;
// "(kiralık)" on a club marks a loan; a club repeated in the list is a real
// second stint (a return). Years are intentionally omitted.

export interface LegendClub {
  name: string
  loan: boolean
}
export interface Legend {
  name: string
  country: string
  isGoalkeeper: boolean
  clubs: LegendClub[]
}

function parse(raw: string): Legend[] {
  const out: Legend[] = []
  let country = ''
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('#')) {
      country = t.slice(1).trim()
      continue
    }
    const eq = t.indexOf('=')
    if (eq === -1) continue
    let name = t.slice(0, eq).trim()
    const clubsRaw = t.slice(eq + 1).trim()
    let isGoalkeeper = false
    if (name.endsWith('(KL)')) {
      isGoalkeeper = true
      name = name.slice(0, -4).trim()
    }
    const clubs: LegendClub[] = clubsRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const loan = /\(kiralık\)/i.test(c)
        return { name: c.replace(/\(kiralık\)/i, '').trim(), loan }
      })
    if (name && clubs.length) out.push({ name, country, isGoalkeeper, clubs })
  }
  return out
}

let cache: Legend[] | null = null
export function allLegends(): Legend[] {
  if (!cache) cache = parse(LEGENDS_RAW)
  return cache
}

// Distinct club names a legend turned out for (loans + returns collapsed),
// lower-cased for matching across the dataset.
export function legendClubKeys(l: Legend): Set<string> {
  return new Set(l.clubs.map((c) => c.name.toLowerCase()))
}

// Clubs two legends both played for (by name), preserving display casing.
export function sharedClubs(a: Legend, b: Legend): string[] {
  const bk = legendClubKeys(b)
  const seen = new Set<string>()
  const res: string[] = []
  for (const c of a.clubs) {
    const k = c.name.toLowerCase()
    if (bk.has(k) && !seen.has(k)) {
      seen.add(k)
      res.push(c.name)
    }
  }
  return res
}
