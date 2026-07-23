import { query } from '../../db/pool'
import { seededRng, shuffle } from './rng'

// ── Kariyer Zinciri (Career Connect) ────────────────────────────────────────
// A daily set of "which club did BOTH of these players turn out for?" questions.
// Each shows two recognisable, well-travelled players and four club options —
// exactly one is a club both played for; the three decoys are clubs only one of
// them played for (plausible but wrong). Deterministic per calendar day.

const PROMINENT_TEAMS = [
  541, 529, 530, 33, 40, 50, 42, 49, 47, 157, 165, 496, 489, 505, 492, 85, 645,
  611, 549, 998, 532, 536, 548, 212, 194, 173, 168, 91, 81, 66, 34,
]
const PROM_SET = new Set(PROMINENT_TEAMS)

interface PoolPlayer {
  apiId: number
  name: string
  photo: string | null
  clubs: Map<number, string>
}

export interface CareerOption {
  teamApiId: number
  teamName: string
}
export interface CareerQuestion {
  playerA: { apiId: number; name: string; photoUrl: string | null }
  playerB: { apiId: number; name: string; photoUrl: string | null }
  options: CareerOption[]
}

const quizCache = new Map<string, CareerQuestion[]>()

async function loadPool(): Promise<PoolPlayer[]> {
  // Eligible = played for ≥1 prominent club and has a photo (recognisable),
  // ranked by career appearances; grab their full distinct club history.
  const ids = await query<{ player_api_id: number }>(
    `SELECT p.player_api_id
     FROM players p
     WHERE p.player_api_id IN (
       SELECT player_api_id FROM players WHERE team_api_id = ANY($1)
     ) AND p.photo_url IS NOT NULL
     GROUP BY p.player_api_id
     HAVING COUNT(DISTINCT p.team_api_id) >= 2
     ORDER BY SUM(COALESCE(p.appearances, 0)) DESC, p.player_api_id
     LIMIT 220`,
    [PROMINENT_TEAMS],
  )
  const idList = ids.rows.map((r) => r.player_api_id)
  if (idList.length === 0) return []

  const { rows } = await query<{
    player_api_id: number
    name: string
    photo_url: string | null
    team_api_id: number
    team_name: string
  }>(
    // Exclude national teams: their name matches a country/nationality value
    // (e.g. team "Brazil" = nationality "Brazil"), which no real club shares.
    // This is a career-*club* game, so national sides must never be an option.
    `SELECT p.player_api_id, MAX(p.name) AS name, MAX(p.photo_url) AS photo_url,
            p.team_api_id, MAX(p.team_name) AS team_name
     FROM players p
     WHERE p.player_api_id = ANY($1) AND p.team_api_id IS NOT NULL AND p.team_name IS NOT NULL
       AND p.team_name NOT IN (SELECT DISTINCT nationality FROM players WHERE nationality IS NOT NULL)
     GROUP BY p.player_api_id, p.team_api_id`,
    [idList],
  )

  const map = new Map<number, PoolPlayer>()
  for (const r of rows) {
    let pp = map.get(r.player_api_id)
    if (!pp) {
      pp = { apiId: r.player_api_id, name: r.name, photo: r.photo_url, clubs: new Map() }
      map.set(r.player_api_id, pp)
    }
    pp.clubs.set(r.team_api_id, r.team_name)
  }
  // Preserve the appearance ranking from the id query.
  return idList.map((id) => map.get(id)).filter((p): p is PoolPlayer => !!p && p.clubs.size >= 2)
}

// Pick n items, prominent clubs first, deterministically.
function pickPreferProminent(
  ids: number[],
  clubName: (id: number) => string,
  seed: string,
  n: number,
): CareerOption[] {
  const prominent = ids.filter((id) => PROM_SET.has(id))
  const rest = ids.filter((id) => !PROM_SET.has(id))
  const ordered = [...shuffle(prominent, seededRng(seed + '#p')), ...shuffle(rest, seededRng(seed + '#r'))]
  return ordered.slice(0, n).map((id) => ({ teamApiId: id, teamName: clubName(id) }))
}

export async function getDailyCareerQuiz(date: string): Promise<CareerQuestion[]> {
  const cached = quizCache.get(date)
  if (cached) return cached

  const pool = await loadPool()
  const rnd = seededRng(`career#${date}`)

  // Collect valid pairs: share ≥1 club and have ≥3 non-shared clubs for decoys.
  type Pair = { a: PoolPlayer; b: PoolPlayer; shared: number[]; xor: number[] }
  const pairs: Pair[] = []
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i]
      const b = pool[j]
      const shared: number[] = []
      const xor: number[] = []
      for (const c of a.clubs.keys()) (b.clubs.has(c) ? shared : xor).push(c)
      for (const c of b.clubs.keys()) if (!a.clubs.has(c)) xor.push(c)
      if (shared.length >= 1 && xor.length >= 3) pairs.push({ a, b, shared, xor })
    }
  }

  // Greedy over a seeded shuffle so no player repeats across the 8 questions.
  const used = new Set<number>()
  const chosen: Pair[] = []
  for (const p of shuffle(pairs, rnd)) {
    if (used.has(p.a.apiId) || used.has(p.b.apiId)) continue
    used.add(p.a.apiId)
    used.add(p.b.apiId)
    chosen.push(p)
    if (chosen.length >= 8) break
  }

  const questions: CareerQuestion[] = []
  for (const p of chosen) {
    const clubName = (id: number) => p.a.clubs.get(id) ?? p.b.clubs.get(id) ?? '—'
    const correct = pickPreferProminent(p.shared, clubName, `career-c#${date}#${p.a.apiId}#${p.b.apiId}`, 1)[0]
    const decoys = pickPreferProminent(p.xor, clubName, `career-d#${date}#${p.a.apiId}#${p.b.apiId}`, 3)
    if (!correct || decoys.length < 3) continue
    const options = shuffle([correct, ...decoys], seededRng(`career-o#${date}#${p.a.apiId}#${p.b.apiId}`))
    questions.push({
      playerA: { apiId: p.a.apiId, name: p.a.name, photoUrl: p.a.photo },
      playerB: { apiId: p.b.apiId, name: p.b.name, photoUrl: p.b.photo },
      options,
    })
  }

  quizCache.set(date, questions)
  return questions
}

// Validate: return the clubs both players actually share, so the client can
// mark the correct option (decoys are non-shared by construction).
export async function checkCareerGuess(
  playerAApiId: number,
  playerBApiId: number,
): Promise<{ sharedTeamApiIds: number[] }> {
  const { rows } = await query<{ team_api_id: number }>(
    `SELECT DISTINCT a.team_api_id
     FROM players a
     JOIN players b ON b.team_api_id = a.team_api_id
     WHERE a.player_api_id = $1 AND b.player_api_id = $2 AND a.team_api_id IS NOT NULL`,
    [playerAApiId, playerBApiId],
  )
  return { sharedTeamApiIds: rows.map((r) => r.team_api_id) }
}
