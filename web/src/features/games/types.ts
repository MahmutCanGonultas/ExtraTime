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
