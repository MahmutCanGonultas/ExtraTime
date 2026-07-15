import type { PoolClient } from 'pg'

export interface LeagueSeed {
  apiFootballId: number
  name: string
  country: string
  // API-Football season is the starting year (2024 = the 2024/25 season).
  // Adjust to the season your API-Football plan grants access to.
  season: number
  isActive: boolean
}

// The set of competitions we track. Adding a league here (or a row in the DB)
// is all it takes — sync picks up every active league automatically.
export const LEAGUE_SEEDS: LeagueSeed[] = [
  { apiFootballId: 203, name: 'Süper Lig', country: 'Türkiye', season: 2024, isActive: true },
  { apiFootballId: 39, name: 'Premier League', country: 'İngiltere', season: 2024, isActive: true },
  { apiFootballId: 140, name: 'La Liga', country: 'İspanya', season: 2024, isActive: true },
  { apiFootballId: 135, name: 'Serie A', country: 'İtalya', season: 2024, isActive: true },
  { apiFootballId: 78, name: 'Bundesliga', country: 'Almanya', season: 2024, isActive: true },
  { apiFootballId: 2, name: 'Şampiyonlar Ligi', country: 'Avrupa', season: 2024, isActive: true },
]

// Upserts the configured leagues into the DB. Safe to run repeatedly.
export async function seedLeagues(db: PoolClient): Promise<number> {
  for (const l of LEAGUE_SEEDS) {
    await db.query(
      `INSERT INTO leagues (api_football_id, name, country, season, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (api_football_id) DO UPDATE
         SET name = EXCLUDED.name,
             country = EXCLUDED.country,
             season = EXCLUDED.season,
             is_active = EXCLUDED.is_active,
             updated_at = now()`,
      [l.apiFootballId, l.name, l.country, l.season, l.isActive],
    )
  }
  return LEAGUE_SEEDS.length
}
