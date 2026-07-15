import type { PoolClient } from 'pg'

export interface Competition {
  apiFootballId: number
  name: string
  country: string
}

export interface LeagueSeed extends Competition {
  season: number
  isActive: boolean
}

// The competitions we track. Adding one here (or a row in the DB) is all it
// takes — sync picks up every active league automatically.
export const COMPETITIONS: Competition[] = [
  { apiFootballId: 203, name: 'Süper Lig', country: 'Türkiye' },
  { apiFootballId: 39, name: 'Premier League', country: 'İngiltere' },
  { apiFootballId: 140, name: 'La Liga', country: 'İspanya' },
  { apiFootballId: 135, name: 'Serie A', country: 'İtalya' },
  { apiFootballId: 78, name: 'Bundesliga', country: 'Almanya' },
  { apiFootballId: 2, name: 'Şampiyonlar Ligi', country: 'Avrupa' },
]

// API-Football season = the starting year (2024 = the 2024/25 season). The
// current season is synced live; past seasons are seeded inactive and filled
// once via the backfill endpoint. Adjust to the seasons your API-Football plan
// actually grants access to (the free plan is limited — see docs/setup notes).
export const CURRENT_SEASON = 2024
export const HISTORY_SEASONS = [2023, 2022]

export const LEAGUE_SEEDS: LeagueSeed[] = COMPETITIONS.flatMap((c) => [
  { ...c, season: CURRENT_SEASON, isActive: true },
  ...HISTORY_SEASONS.map((season) => ({ ...c, season, isActive: false })),
])

// Upserts the configured league-seasons into the DB. Safe to run repeatedly.
export async function seedLeagues(db: PoolClient): Promise<number> {
  for (const l of LEAGUE_SEEDS) {
    await db.query(
      `INSERT INTO leagues (api_football_id, name, country, season, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (api_football_id, season) DO UPDATE
         SET name = EXCLUDED.name,
             country = EXCLUDED.country,
             is_active = EXCLUDED.is_active,
             updated_at = now()`,
      [l.apiFootballId, l.name, l.country, l.season, l.isActive],
    )
  }
  return LEAGUE_SEEDS.length
}
