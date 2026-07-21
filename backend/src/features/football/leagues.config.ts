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
  { apiFootballId: 94, name: 'Primeira Liga', country: 'Portekiz' },
  { apiFootballId: 88, name: 'Eredivisie', country: 'Hollanda' },
  { apiFootballId: 71, name: 'Brasileirão', country: 'Brezilya' },
  { apiFootballId: 307, name: 'Suudi Pro Ligi', country: 'Suudi Arabistan' },
  { apiFootballId: 253, name: 'MLS', country: 'ABD' },
  // Second divisions of the leagues above. (Serie B, Ligue 2, Brazil Serie B, the
  // Saudi first division and the Dutch Eerste Divisie were removed — low interest,
  // not worth the API cost.)
  { apiFootballId: 40, name: 'Championship', country: 'İngiltere' },
  { apiFootballId: 141, name: 'La Liga 2', country: 'İspanya' },
  { apiFootballId: 79, name: '2. Bundesliga', country: 'Almanya' },
  { apiFootballId: 95, name: 'Liga Portugal 2', country: 'Portekiz' },
  { apiFootballId: 204, name: 'TFF 1. Lig', country: 'Türkiye' },
  { apiFootballId: 2, name: 'Şampiyonlar Ligi', country: 'Avrupa' },
  { apiFootballId: 3, name: 'UEFA Avrupa Ligi', country: 'Avrupa' },
  { apiFootballId: 848, name: 'UEFA Konferans Ligi', country: 'Avrupa' },
]

// National (domestic) cups of the leagues above — pure knockout, so they get a
// bracket (no standings). API-Football league ids.
export const DOMESTIC_CUPS: Competition[] = [
  { apiFootballId: 206, name: 'Türkiye Kupası', country: 'Türkiye' },
  { apiFootballId: 45, name: 'FA Cup', country: 'İngiltere' },
  { apiFootballId: 143, name: 'Copa del Rey', country: 'İspanya' },
  { apiFootballId: 137, name: 'Coppa Italia', country: 'İtalya' },
  { apiFootballId: 81, name: 'DFB Pokal', country: 'Almanya' },
  { apiFootballId: 66, name: 'Coupe de France', country: 'Fransa' },
]
export const DOMESTIC_CUP_API_IDS = DOMESTIC_CUPS.map((c) => c.apiFootballId)

// The most recent COMPLETE season (full standings/scorers) shown in browse.
export const CURRENT_SEASON = 2025
// The next season — fixtures are scheduled, used by the prediction game.
export const UPCOMING_SEASON = 2026
export const HISTORY_SEASONS = [2024, 2023]

export const LEAGUE_SEEDS: LeagueSeed[] = [
  ...[...CLUB_COMPETITIONS, ...DOMESTIC_CUPS].flatMap((c) => [
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

// Per-match detail (goals, cards, subs, team stats) costs ~2 API req/match. On the
// paid Pro plan (7500 req/day) we deliberately scope match-detail enrichment to the
// competitions users actually follow here — the six big leagues, the three UEFA club
// cups, the World Cup, MLS and the Saudi Pro League. Everything else (other top
// leagues like Portugal/Netherlands/Brazil, all domestic cups, second divisions) is
// skipped to keep the backfill cheap and focused.
export const MATCH_DETAIL_LEAGUE_API_IDS = [
  39, 140, 78, 135, 61, 203, // Premier, La Liga, Bundesliga, Serie A, Ligue 1, Süper Lig
  2, 3, 848, // Champions League, Europa League, Conference League
  1, // World Cup
  253, 307, // MLS, Suudi Pro Ligi
]

// The single source of truth for "our leagues". Any browse/upcoming/live list is
// restricted to these api_football_ids — no stray competition ever leaks in.
export const CONFIGURED_LEAGUE_API_IDS = [
  ...CLUB_COMPETITIONS.map((c) => c.apiFootballId),
  ...DOMESTIC_CUP_API_IDS,
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
