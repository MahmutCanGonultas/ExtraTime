import { query } from '../../db/pool'
import { seededRng, shuffle } from './rng'

// ── Gol Kimin? (Whose Goal) ─────────────────────────────────────────────────
// A daily 10-question quiz. Each question shows a real finished match (teams +
// final score) and one goal's minute; the player picks who scored from four
// options (the real scorer + three plausible decoys drawn from the same two
// clubs). Deterministic per calendar day, so the whole group gets the same set.

// Big leagues + European club competitions — keeps the matches recognisable.
const QUIZ_LEAGUES = [39, 140, 78, 135, 61, 203, 2, 3]
// Prominent clubs; a question is only used if one side is on this list.
const PROMINENT_TEAMS = [
  541, 529, 530, 33, 40, 50, 42, 49, 47, 157, 165, 496, 489, 505, 492, 85, 157,
  645, 611, 549, 998, 532, 536, 548, 212, 194, 173, 168, 91, 81, 78, 80, 66, 34,
]

export interface GoalQuestion {
  eventId: number
  home: { name: string; apiId: number }
  away: { name: string; apiId: number }
  homeScore: number | null
  awayScore: number | null
  // Running score right AFTER this goal, so the player can see who just went ahead.
  scoredHome: number
  scoredAway: number
  scoringSide: 'home' | 'away'
  leagueApiId: number
  minute: number | null
  extraMinute: number | null
  detail: string
  options: string[]
}

interface Candidate {
  event_id: number
  fixture_id: number
  team_api_id: number
  minute: number | null
  extra_minute: number | null
  player_name: string
  detail: string
  home_score: number | null
  away_score: number | null
  home_name: string
  home_api: number
  away_name: string
  away_api: number
  league_api: number
}

const quizCache = new Map<string, GoalQuestion[]>()

// Running score right after `eventId`, plus which side scored it. Own goals are
// credited to the opposing side so the tally matches the scoreboard.
async function runningScoreAt(
  fixtureId: number,
  homeApi: number,
  eventId: number,
): Promise<{ home: number; away: number; side: 'home' | 'away' }> {
  const { rows } = await query<{ id: number; team_api_id: number; detail: string }>(
    `SELECT id, team_api_id, detail FROM fixture_events
     WHERE fixture_id = $1 AND type = 'Goal' AND detail <> 'Missed Penalty'
     ORDER BY minute NULLS LAST, extra_minute NULLS LAST, sort_order NULLS LAST, id`,
    [fixtureId],
  )
  let home = 0
  let away = 0
  let side: 'home' | 'away' = 'home'
  for (const g of rows) {
    const isHomeTeam = g.team_api_id === homeApi
    const creditsHome = g.detail === 'Own Goal' ? !isHomeTeam : isHomeTeam
    if (creditsHome) home++
    else away++
    if (g.id === eventId) {
      side = isHomeTeam ? 'home' : 'away'
      break
    }
  }
  return { home, away, side }
}

async function decoyPool(scorer: string, teamApiIds: number[], leagueApi: number): Promise<string[]> {
  // Decoys from the SAME team that scored (the running score reveals which side),
  // so every option is plausible; fall back to the league if that side is thin.
  const teamScorers = await query<{ player_name: string }>(
    `SELECT DISTINCT player_name FROM fixture_events
     WHERE type = 'Goal' AND player_name IS NOT NULL AND player_name <> $1
       AND team_api_id = ANY($2) LIMIT 40`,
    [scorer, teamApiIds],
  )
  let names = teamScorers.rows.map((r) => r.player_name)
  if (names.length < 3) {
    const leagueScorers = await query<{ player_name: string }>(
      `SELECT player_name FROM fixture_events e JOIN fixtures f ON f.id = e.fixture_id
         JOIN leagues l ON l.id = f.league_id
       WHERE e.type = 'Goal' AND e.player_name IS NOT NULL AND e.player_name <> $1
         AND l.api_football_id = $2
       GROUP BY player_name ORDER BY COUNT(*) DESC LIMIT 40`,
      [scorer, leagueApi],
    )
    names = [...new Set([...names, ...leagueScorers.rows.map((r) => r.player_name)])]
  }
  return names
}

export async function getDailyGoalQuiz(date: string): Promise<GoalQuestion[]> {
  const cached = quizCache.get(date)
  if (cached) return cached

  const { rows } = await query<Candidate>(
    `SELECT e.id AS event_id, e.fixture_id, e.team_api_id, e.minute, e.extra_minute, e.player_name, e.detail,
            f.home_score, f.away_score,
            ht.name AS home_name, ht.api_football_id AS home_api,
            at.name AS away_name, at.api_football_id AS away_api,
            l.api_football_id AS league_api
     FROM fixture_events e
     JOIN fixtures f ON f.id = e.fixture_id
     JOIN teams ht ON ht.id = f.home_team_id
     JOIN teams at ON at.id = f.away_team_id
     JOIN leagues l ON l.id = f.league_id
     WHERE e.type = 'Goal' AND e.player_name IS NOT NULL
       AND e.detail NOT IN ('Missed Penalty', 'Own Goal')
       AND f.status IN ('FT', 'AET', 'PEN')
       AND l.api_football_id = ANY($1)
       AND (ht.api_football_id = ANY($2) OR at.api_football_id = ANY($2))
     ORDER BY f.kickoff_at DESC
     LIMIT 800`,
    [QUIZ_LEAGUES, PROMINENT_TEAMS],
  )

  const rnd = seededRng(`goal#${date}`)
  const pickedFixtures = new Set<string>()
  const chosen: Candidate[] = []
  for (const c of shuffle(rows, rnd)) {
    // At most one question per match, so the quiz spans many games.
    const fx = `${c.home_api}-${c.away_api}-${c.home_score}-${c.away_score}`
    if (pickedFixtures.has(fx)) continue
    pickedFixtures.add(fx)
    chosen.push(c)
    if (chosen.length >= 10) break
  }

  const questions: GoalQuestion[] = []
  for (const c of chosen) {
    const run = await runningScoreAt(c.fixture_id, c.home_api, c.event_id)
    // Decoys come from the team that scored (the running score gives the side away).
    const pool = await decoyPool(c.player_name, [c.team_api_id], c.league_api)
    const decoys = shuffle(pool, seededRng(`decoy#${date}#${c.event_id}`)).slice(0, 3)
    if (decoys.length < 3) continue // skip questions we can't build 4 options for
    const options = shuffle([c.player_name, ...decoys], seededRng(`opt#${date}#${c.event_id}`))
    questions.push({
      eventId: c.event_id,
      home: { name: c.home_name, apiId: c.home_api },
      away: { name: c.away_name, apiId: c.away_api },
      homeScore: c.home_score,
      awayScore: c.away_score,
      scoredHome: run.home,
      scoredAway: run.away,
      scoringSide: run.side,
      leagueApiId: c.league_api,
      minute: c.minute,
      extraMinute: c.extra_minute,
      detail: c.detail,
      options,
    })
  }

  quizCache.set(date, questions)
  return questions
}

// Validate one answer server-side: does the chosen name match the real scorer?
export async function checkGoalGuess(
  eventId: number,
  choice: string,
): Promise<{ correct: boolean; scorer: string | null }> {
  const { rows } = await query<{ player_name: string | null }>(
    `SELECT player_name FROM fixture_events WHERE id = $1 AND type = 'Goal' LIMIT 1`,
    [eventId],
  )
  const scorer = rows[0]?.player_name ?? null
  return { correct: scorer != null && scorer === choice, scorer }
}
