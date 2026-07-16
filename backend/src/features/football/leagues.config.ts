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

// Yearly club/continental competitions. API-Football season = the starting year
// (2025 = the 2025/26 season).
export const CLUB_COMPETITIONS: Competition[] = [
  { apiFootballId: 203, name: 'Süper Lig', country: 'Türkiye' },
  { apiFootballId: 39, name: 'Premier League', country: 'İngiltere' },
  { apiFootballId: 140, name: 'La Liga', country: 'İspanya' },
  { apiFootballId: 135, name: 'Serie A', country: 'İtalya' },
  { apiFootballId: 78, name: 'Bundesliga', country: 'Almanya' },
  { apiFootballId: 61, name: 'Ligue 1', country: 'Fransa' },
  { apiFootballId: 2, name: 'Şampiyonlar Ligi', country: 'Avrupa' },
]

// The most recent COMPLETE season (full standings/scorers) shown in browse.
export const CURRENT_SEASON = 2025
// The next season — fixtures are scheduled, used by the prediction game.
export const UPCOMING_SEASON = 2026
export const HISTORY_SEASONS = [2024, 2023]

export const LEAGUE_SEEDS: LeagueSeed[] = [
  ...CLUB_COMPETITIONS.flatMap((c) => [
    { ...c, season: CURRENT_SEASON, isActive: true },
    { ...c, season: UPCOMING_SEASON, isActive: true },
    ...HISTORY_SEASONS.map((season) => ({ ...c, season, isActive: false })),
  ]),
  // World Cup (a national-team tournament). 2026 is live now; 2022 is history.
  { apiFootballId: 1, name: 'Dünya Kupası', country: 'Dünya', season: 2026, isActive: true },
  { apiFootballId: 1, name: 'Dünya Kupası', country: 'Dünya', season: 2022, isActive: false },
]

// Tournaments (as opposed to yearly club leagues): once every match is played the
// event is over, so it gets auto-retired from the home page. Club leagues never
// auto-retire — their completed season stays browsable.
export const TOURNAMENT_API_IDS = [1]

// The single source of truth for "our leagues". Any browse/upcoming/live list is
// restricted to these api_football_ids — no stray competition ever leaks in.
export const CONFIGURED_LEAGUE_API_IDS = [
  ...CLUB_COMPETITIONS.map((c) => c.apiFootballId),
  ...TOURNAMENT_API_IDS,
]

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
