import { query } from '../../db/pool'
import { syncPlayerTransfers } from '../football/sync/jobs'
import { hasTransferSync } from '../football/football.repository'

// ── Kare Bulmaca (Immaculate Grid) ──────────────────────────────────────────
// A daily 3×3 grid. Each row and column is a category; a cell is solved by naming
// a player who satisfies BOTH its row and column. Categories are clubs the player
// has turned out for, their nationality, a league they've played in, or their
// position. The grid is generated deterministically per calendar day and validated
// so every cell has at least a few valid answers.

export type GridCategory =
  | { kind: 'club'; id: number; label: string }
  | { kind: 'nat'; values: string[]; label: string }
  | { kind: 'league'; id: number; label: string }
  | { kind: 'pos'; values: string[]; label: string }

const CLUBS: GridCategory[] = [
  { kind: 'club', id: 541, label: 'Real Madrid' },
  { kind: 'club', id: 529, label: 'Barcelona' },
  { kind: 'club', id: 33, label: 'Man United' },
  { kind: 'club', id: 50, label: 'Man City' },
  { kind: 'club', id: 40, label: 'Liverpool' },
  { kind: 'club', id: 42, label: 'Arsenal' },
  { kind: 'club', id: 49, label: 'Chelsea' },
  { kind: 'club', id: 47, label: 'Tottenham' },
  { kind: 'club', id: 157, label: 'Bayern München' },
  { kind: 'club', id: 165, label: 'Dortmund' },
  { kind: 'club', id: 496, label: 'Juventus' },
  { kind: 'club', id: 489, label: 'Milan' },
  { kind: 'club', id: 505, label: 'Inter' },
  { kind: 'club', id: 492, label: 'Napoli' },
  { kind: 'club', id: 85, label: 'PSG' },
  { kind: 'club', id: 530, label: 'Atlético Madrid' },
  { kind: 'club', id: 645, label: 'Galatasaray' },
  { kind: 'club', id: 611, label: 'Fenerbahçe' },
  { kind: 'club', id: 549, label: 'Beşiktaş' },
  { kind: 'club', id: 998, label: 'Trabzonspor' },
]
const NATIONS: GridCategory[] = [
  { kind: 'nat', values: ['Brazil'], label: '🇧🇷 Brezilya' },
  { kind: 'nat', values: ['Spain'], label: '🇪🇸 İspanya' },
  { kind: 'nat', values: ['France'], label: '🇫🇷 Fransa' },
  { kind: 'nat', values: ['Türkiye', 'Turkey'], label: '🇹🇷 Türkiye' },
  { kind: 'nat', values: ['Netherlands'], label: '🇳🇱 Hollanda' },
  { kind: 'nat', values: ['England'], label: '🏴 İngiltere' },
  { kind: 'nat', values: ['Germany'], label: '🇩🇪 Almanya' },
  { kind: 'nat', values: ['Argentina'], label: '🇦🇷 Arjantin' },
  { kind: 'nat', values: ['Portugal'], label: '🇵🇹 Portekiz' },
  { kind: 'nat', values: ['Italy'], label: '🇮🇹 İtalya' },
]
const LEAGUES: GridCategory[] = [
  { kind: 'league', id: 39, label: 'Premier Lig' },
  { kind: 'league', id: 140, label: 'La Liga' },
  { kind: 'league', id: 78, label: 'Bundesliga' },
  { kind: 'league', id: 135, label: 'Serie A' },
  { kind: 'league', id: 61, label: 'Ligue 1' },
  { kind: 'league', id: 203, label: 'Süper Lig' },
]
const POSITIONS: GridCategory[] = [
  { kind: 'pos', values: ['Goalkeeper'], label: 'Kaleci' },
  { kind: 'pos', values: ['Defender'], label: 'Defans' },
  { kind: 'pos', values: ['Midfielder'], label: 'Orta Saha' },
  { kind: 'pos', values: ['Attacker', 'Forward'], label: 'Forvet' },
]
const POOL = [...CLUBS, ...NATIONS, ...LEAGUES, ...POSITIONS]

// A recognisable answer: any player with a photo who satisfies the category.
async function matchingSet(cat: GridCategory): Promise<Set<number>> {
  let sql: string
  let params: unknown[]
  if (cat.kind === 'club') {
    sql = `SELECT DISTINCT player_api_id FROM players WHERE team_api_id = $1 AND photo_url IS NOT NULL`
    params = [cat.id]
  } else if (cat.kind === 'nat') {
    sql = `SELECT DISTINCT player_api_id FROM players WHERE nationality = ANY($1) AND photo_url IS NOT NULL`
    params = [cat.values]
  } else if (cat.kind === 'pos') {
    sql = `SELECT DISTINCT player_api_id FROM players WHERE position = ANY($1) AND photo_url IS NOT NULL`
    params = [cat.values]
  } else {
    sql = `SELECT DISTINCT p.player_api_id FROM players p JOIN leagues l ON l.id = p.league_id
           WHERE l.api_football_id = $1 AND p.photo_url IS NOT NULL`
    params = [cat.id]
  }
  const { rows } = await query<{ player_api_id: number }>(sql, params)
  return new Set(rows.map((r) => r.player_api_id))
}

// Every club a player has EVER turned out for: recent squad rows (`players`)
// plus their full transfer history (`player_transfers`). This is what lets a
// historically-correct answer (Ronaldo → Juventus, Modrić → Tottenham) count
// even though our squad snapshots only cover recent seasons.
async function playerClubSet(playerApiId: number): Promise<number[]> {
  const { rows } = await query<{ id: number }>(
    `SELECT team_api_id AS id FROM players WHERE player_api_id = $1 AND team_api_id IS NOT NULL
     UNION
     SELECT in_team_api_id FROM player_transfers WHERE player_api_id = $1 AND in_team_api_id IS NOT NULL
     UNION
     SELECT out_team_api_id FROM player_transfers WHERE player_api_id = $1 AND out_team_api_id IS NOT NULL`,
    [playerApiId],
  )
  return rows.map((r) => r.id)
}

// True when a player satisfies a category. Clubs/leagues are checked against the
// player's full career club set; a league is satisfied when any of those clubs is
// a known club of that league in our data. Nationality/position come from squad rows.
export async function playerSatisfies(
  playerApiId: number,
  cat: GridCategory,
  clubSet: number[],
): Promise<boolean> {
  if (cat.kind === 'club') return clubSet.includes(cat.id)
  if (cat.kind === 'nat') {
    const { rowCount } = await query(
      `SELECT 1 FROM players WHERE player_api_id = $1 AND nationality = ANY($2) LIMIT 1`,
      [playerApiId, cat.values],
    )
    return (rowCount ?? 0) > 0
  }
  if (cat.kind === 'pos') {
    const { rowCount } = await query(
      `SELECT 1 FROM players WHERE player_api_id = $1 AND position = ANY($2) LIMIT 1`,
      [playerApiId, cat.values],
    )
    return (rowCount ?? 0) > 0
  }
  // league
  if (clubSet.length === 0) return false
  const { rowCount } = await query(
    `SELECT 1 FROM players p JOIN leagues l ON l.id = p.league_id
     WHERE p.team_api_id = ANY($1) AND l.api_football_id = $2 LIMIT 1`,
    [clubSet, cat.id],
  )
  return (rowCount ?? 0) > 0
}

// Deterministic per-day PRNG (mulberry32 seeded from the date string).
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
const intersectSize = (a: Set<number>, b: Set<number>): number => {
  const [s, l] = a.size < b.size ? [a, b] : [b, a]
  let n = 0
  for (const x of s) if (l.has(x)) n++
  return n
}

export interface GridCell {
  row: number
  col: number
  answerCount: number
}
export interface DailyGrid {
  date: string
  rows: Array<Omit<GridCategory, never>>
  cols: Array<Omit<GridCategory, never>>
  cells: GridCell[]
}

const MIN_ANSWERS = 3 // each cell must have at least this many valid players
const gridCache = new Map<string, DailyGrid>()

// Build the day's grid: pick 3 rows + 3 cols from the pool so every intersection is
// solvable. Greedy over a seeded shuffle, retried with fresh shuffles if needed.
export async function getDailyGrid(date: string): Promise<DailyGrid> {
  const cached = gridCache.get(date)
  if (cached) return cached

  const sets = new Map<GridCategory, Set<number>>()
  for (const cat of POOL) sets.set(cat, await matchingSet(cat))
  const setOf = (c: GridCategory) => sets.get(c)!

  for (let attempt = 0; attempt < 40; attempt++) {
    const rnd = seededRng(`${date}#${attempt}`)
    const shuffled = shuffle(POOL, rnd)
    const rows: GridCategory[] = []
    const cols: GridCategory[] = []
    for (const cat of shuffled) {
      if (rows.length < 3) {
        // A row must intersect every already-chosen col.
        if (cols.every((c) => intersectSize(setOf(cat), setOf(c)) >= MIN_ANSWERS)) rows.push(cat)
        continue
      }
      if (cols.length < 3) {
        if (rows.every((r) => intersectSize(setOf(cat), setOf(r)) >= MIN_ANSWERS)) cols.push(cat)
      }
      if (rows.length === 3 && cols.length === 3) break
    }
    if (rows.length === 3 && cols.length === 3) {
      const cells: GridCell[] = []
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          cells.push({ row: r, col: c, answerCount: intersectSize(setOf(rows[r]), setOf(cols[c])) })
      const grid: DailyGrid = { date, rows, cols, cells }
      gridCache.set(date, grid)
      return grid
    }
  }
  // Extremely unlikely fallback: clubs on rows, nations on cols (always solvable).
  const rows = CLUBS.slice(0, 3)
  const cols = NATIONS.slice(0, 3)
  const cells: GridCell[] = []
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      cells.push({ row: r, col: c, answerCount: intersectSize(setOf(rows[r]), setOf(cols[c])) })
  const grid: DailyGrid = { date, rows, cols, cells }
  gridCache.set(date, grid)
  return grid
}

// Public (no answers) shape for the client: category labels + logo ids + per-cell
// answer counts (a difficulty hint), but never the valid players themselves.
export function serializeCat(cat: GridCategory) {
  return {
    kind: cat.kind,
    label: cat.label,
    teamApiId: cat.kind === 'club' ? cat.id : null,
    leagueApiId: cat.kind === 'league' ? cat.id : null,
  }
}
export async function getDailyGridPublic(date: string) {
  const g = await getDailyGrid(date)
  return {
    date: g.date,
    rows: (g.rows as GridCategory[]).map(serializeCat),
    cols: (g.cols as GridCategory[]).map(serializeCat),
    cells: g.cells,
  }
}

// Rarity score for a correct answer: the LESS well-known the player, the more
// points — like the real immaculate grid, an obscure-but-correct pick is worth
// more than an obvious superstar. Prominence = career appearances + goals weight;
// mapped to a friendly, bounded 5–50 range so it never swings wildly.
function rarityPoints(prominence: number): number {
  return Math.max(5, Math.min(50, Math.round(1600 / (prominence + 40))))
}

// Check a guess for a cell; on success return the player's name + photo + points.
export async function validateGridGuess(
  date: string,
  row: number,
  col: number,
  playerApiId: number,
): Promise<{ correct: boolean; player?: { name: string; photoUrl: string | null }; points?: number }> {
  const g = await getDailyGrid(date)
  const rowCat = (g.rows as GridCategory[])[row]
  const colCat = (g.cols as GridCategory[])[col]
  if (!rowCat || !colCat) return { correct: false }
  // Lazily fill this player's full career the first time they're guessed (1 API
  // request, cached forever), so historical clubs/leagues count. Cache-first.
  if (!(await hasTransferSync(playerApiId))) {
    try {
      await syncPlayerTransfers(playerApiId)
    } catch {
      /* fall back to whatever squad rows we already hold */
    }
  }
  const clubSet = await playerClubSet(playerApiId)
  const ok =
    (await playerSatisfies(playerApiId, rowCat, clubSet)) &&
    (await playerSatisfies(playerApiId, colCat, clubSet))
  if (!ok) return { correct: false }
  const { rows } = await query<{ name: string; photo_url: string | null; prominence: number }>(
    `SELECT MAX(name) AS name, MAX(photo_url) AS photo_url,
            COALESCE(SUM(appearances), 0) + COALESCE(SUM(goals), 0) * 2 AS prominence
     FROM players WHERE player_api_id = $1`,
    [playerApiId],
  )
  return {
    correct: true,
    player: { name: rows[0]?.name ?? '', photoUrl: rows[0]?.photo_url ?? null },
    points: rarityPoints(Number(rows[0]?.prominence ?? 0)),
  }
}
