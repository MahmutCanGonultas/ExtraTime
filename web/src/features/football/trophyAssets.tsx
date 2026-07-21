import { useState } from 'react'
import { Trophy } from 'lucide-react'
import type { TeamHonours, TeamHonourYears } from './types'

// Real trophy photos in /public/trophies. The league-title and national-cup image
// depend on which of the six leagues the club plays in; the European/world ones
// are fixed. (jpg or png per source.)
export const TROPHY_IMG: Record<string, string> = {
  'champions-league': '/trophies/champions-league.png',
  'europa-league': '/trophies/europa-league.png',
  'conference-league': '/trophies/conference-league.png',
  'super-cup': '/trophies/super-cup.png',
  'club-world-cup': '/trophies/club-world-cup.png',
  'cup-winners-cup': '/trophies/cup-winners-cup.png',
  'la-liga': '/trophies/la-liga.png',
  'premier-league': '/trophies/premier-league.png',
  bundesliga: '/trophies/bundesliga.png',
  'serie-a': '/trophies/serie-a.jpg',
  'ligue-1': '/trophies/ligue-1.png',
  'super-lig': '/trophies/super-lig.png',
  'copa-del-rey': '/trophies/copa-del-rey.png',
  'fa-cup': '/trophies/fa-cup.png',
  'dfb-pokal': '/trophies/dfb-pokal.png',
  'coppa-italia': '/trophies/coppa-italia.png',
  'coupe-de-france': '/trophies/coupe-de-france.png',
  'turkiye-kupasi': '/trophies/turkiye-kupasi.jpg',
}

const LEAGUE_TROPHY: Record<number, { league: string; cup: string }> = {
  39: { league: 'premier-league', cup: 'fa-cup' },
  140: { league: 'la-liga', cup: 'copa-del-rey' },
  78: { league: 'bundesliga', cup: 'dfb-pokal' },
  135: { league: 'serie-a', cup: 'coppa-italia' },
  61: { league: 'ligue-1', cup: 'coupe-de-france' },
  203: { league: 'super-lig', cup: 'turkiye-kupasi' },
}

// The REAL competition name per league, so a league title reads "La Liga" / "Süper
// Lig" and a domestic cup reads "FA Cup" / "Türkiye Kupası" — not a generic label.
const LEAGUE_NAME: Record<number, { league: string; cup: string }> = {
  39: { league: 'Premier League', cup: 'FA Cup' },
  140: { league: 'La Liga', cup: 'Copa del Rey' },
  78: { league: 'Bundesliga', cup: 'DFB-Pokal' },
  135: { league: 'Serie A', cup: 'Coppa Italia' },
  61: { league: 'Ligue 1', cup: 'Coupe de France' },
  203: { league: 'Süper Lig', cup: 'Türkiye Kupası' },
}

function honourLabel(
  key: keyof TeamHonours,
  fallback: string,
  leagueApiId?: number,
): string {
  const info = leagueApiId ? LEAGUE_NAME[leagueApiId] : undefined
  if (key === 'leagueTitles' && info) return info.league
  if (key === 'domesticCups' && info) return info.cup
  return fallback
}

const CONTINENTAL_SLUG: Partial<Record<keyof TeamHonours, string>> = {
  championsLeague: 'champions-league',
  europaLeague: 'europa-league',
  conferenceLeague: 'conference-league',
  cupWinnersCup: 'cup-winners-cup',
  uefaSuperCup: 'super-cup',
  clubWorldCup: 'club-world-cup',
}

// Order shown, most prestigious first.
const HONOUR_ORDER: Array<{ key: keyof TeamHonours; label: string }> = [
  { key: 'leagueTitles', label: 'Lig Şampiyonluğu' },
  { key: 'championsLeague', label: 'Şampiyonlar Ligi' },
  { key: 'domesticCups', label: 'Ülke Kupası' },
  { key: 'europaLeague', label: 'UEFA Avrupa Ligi' },
  { key: 'clubWorldCup', label: 'Dünya Kulüpler Kupası' },
  { key: 'conferenceLeague', label: 'Konferans Ligi' },
  { key: 'cupWinnersCup', label: 'Kupa Galipleri Kupası' },
  { key: 'uefaSuperCup', label: 'UEFA Süper Kupa' },
]

function honourSlug(key: keyof TeamHonours, leagueApiId?: number): string | undefined {
  if (key === 'leagueTitles') return leagueApiId ? LEAGUE_TROPHY[leagueApiId]?.league : undefined
  if (key === 'domesticCups') return leagueApiId ? LEAGUE_TROPHY[leagueApiId]?.cup : undefined
  return CONTINENTAL_SLUG[key]
}

export interface WonTrophy {
  key: keyof TeamHonours
  label: string
  count: number
  slug?: string
  img?: string
  years: number[]
}

// Turns the raw honour counts into a display list (most prestigious first),
// dropping anything the club hasn't won, and attaching its photo + years.
export function wonTrophies(
  trophies: TeamHonours | null,
  leagueApiId?: number,
  years?: TeamHonourYears | null,
): WonTrophy[] {
  if (!trophies) return []
  return HONOUR_ORDER.map((it) => {
    const slug = honourSlug(it.key, leagueApiId)
    return {
      ...it,
      label: honourLabel(it.key, it.label, leagueApiId),
      count: trophies[it.key],
      slug,
      img: slug ? TROPHY_IMG[slug] : undefined,
      years: years?.[it.key] ?? [],
    }
  }).filter((it) => it.count > 0)
}

// The trophy photo, falling back to a trophy icon if the image is missing/broken.
export function TrophyImage({ src, label }: { src?: string; label: string }) {
  const [failed, setFailed] = useState(!src)
  if (failed || !src) return <Trophy className="h-2/3 w-2/3 text-amber-400/70" />
  return (
    <img
      src={src}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
      className="max-h-full max-w-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
    />
  )
}
