// ── Kare Bulmaca (Immaculate Grid) shared types ─────────────────────────────

export interface GridCat {
  kind: 'club' | 'nat' | 'league' | 'pos'
  label: string
  teamApiId: number | null
  leagueApiId: number | null
}

export interface GridCell {
  row: number
  col: number
  answerCount: number
}

export interface DailyGrid {
  date: string
  rows: GridCat[]
  cols: GridCat[]
  cells: GridCell[]
}

export interface GridGuessResult {
  correct: boolean
  player?: { name: string; photoUrl: string | null }
}

// ── Gol Kimin? (Whose Goal) ─────────────────────────────────────────────────

export interface GoalQuestion {
  eventId: number
  home: { name: string; apiId: number }
  away: { name: string; apiId: number }
  homeScore: number | null
  awayScore: number | null
  leagueApiId: number
  minute: number | null
  extraMinute: number | null
  detail: string
  options: string[]
}

export interface GoalGuessResult {
  correct: boolean
  scorer: string | null
}
