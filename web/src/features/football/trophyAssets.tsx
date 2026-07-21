import type { TeamHonours, TeamHonourYears } from './types'

// Each league's title + main cup: the CORRECT competition name and a signature colour
// (bright enough to pop on the dark cabinet), so a trophy reads as "Premier League" /
// "FA Cup" for the club's actual league — not a generic "Lig Şampiyonluğu".
const LEAGUE_INFO: Record<
  number,
  { league: { name: string; color: string }; cup: { name: string; color: string } }
> = {
  39: { league: { name: 'Premier League', color: '#a855f7' }, cup: { name: 'FA Cup', color: '#f87171' } },
  140: { league: { name: 'La Liga', color: '#ff5a5f' }, cup: { name: 'Copa del Rey', color: '#fbbf24' } },
  78: { league: { name: 'Bundesliga', color: '#ef4444' }, cup: { name: 'DFB-Pokal', color: '#cbd5e1' } },
  135: { league: { name: 'Serie A', color: '#3b82f6' }, cup: { name: 'Coppa Italia', color: '#22d3ee' } },
  61: { league: { name: 'Ligue 1', color: '#38bdf8' }, cup: { name: 'Coupe de France', color: '#60a5fa' } },
  203: { league: { name: 'Süper Lig', color: '#fb7185' }, cup: { name: 'Türkiye Kupası', color: '#34d399' } },
}

// Continental / world honours: fixed name + signature colour.
const CONTINENTAL_INFO: Partial<Record<keyof TeamHonours, { name: string; color: string }>> = {
  championsLeague: { name: 'Şampiyonlar Ligi', color: '#818cf8' },
  europaLeague: { name: 'UEFA Avrupa Ligi', color: '#fb923c' },
  conferenceLeague: { name: 'Konferans Ligi', color: '#34d399' },
  cupWinnersCup: { name: 'Kupa Galipleri Kupası', color: '#cbd5e1' },
  uefaSuperCup: { name: 'UEFA Süper Kupa', color: '#c084fc' },
  clubWorldCup: { name: 'Dünya Kulüpler Kupası', color: '#fbbf24' },
}

// Order shown, most prestigious first.
const HONOUR_ORDER: Array<keyof TeamHonours> = [
  'leagueTitles',
  'championsLeague',
  'domesticCups',
  'europaLeague',
  'clubWorldCup',
  'conferenceLeague',
  'cupWinnersCup',
  'uefaSuperCup',
]

function resolve(key: keyof TeamHonours, leagueApiId?: number): { name: string; color: string } {
  if (key === 'leagueTitles') {
    return (
      (leagueApiId ? LEAGUE_INFO[leagueApiId]?.league : undefined) ?? {
        name: 'Lig Şampiyonluğu',
        color: '#f5b301',
      }
    )
  }
  if (key === 'domesticCups') {
    return (
      (leagueApiId ? LEAGUE_INFO[leagueApiId]?.cup : undefined) ?? {
        name: 'Ülke Kupası',
        color: '#9ca3af',
      }
    )
  }
  return CONTINENTAL_INFO[key] ?? { name: String(key), color: '#f5b301' }
}

export interface WonTrophy {
  key: keyof TeamHonours
  label: string
  count: number
  color: string
  years: number[]
}

// Turns the raw honour counts into a display list (most prestigious first), dropping
// anything the club hasn't won, with the CORRECT name + signature colour + years.
export function wonTrophies(
  trophies: TeamHonours | null,
  leagueApiId?: number,
  years?: TeamHonourYears | null,
): WonTrophy[] {
  if (!trophies) return []
  return HONOUR_ORDER.map((key) => {
    const { name, color } = resolve(key, leagueApiId)
    return { key, label: name, count: trophies[key], color, years: years?.[key] ?? [] }
  }).filter((it) => it.count > 0)
}

// A clean, consistent trophy — a metallic cup rendered in the competition's signature
// colour. Replaces the mismatched photos so the whole cabinet reads as one polished,
// always-rendering set (no external images, no broken sources).
export function TrophyIcon({ color, size = 72 }: { color: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className="drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)]"
    >
      {/* handles */}
      <path d="M17 15 C 4 15, 6 33, 19 31" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M47 15 C 60 15, 58 33, 45 31" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      {/* bowl */}
      <path d="M15 10 H 49 V 21 C 49 34, 41 41, 32 41 C 23 41, 15 34, 15 21 Z" fill={color} />
      {/* highlight */}
      <path
        d="M20 13.5 H 29 V 20 C 29 28, 25.5 33, 21 34 C 19.8 27, 19.2 19, 20 13.5 Z"
        fill="#ffffff"
        opacity="0.28"
      />
      {/* stem */}
      <rect x="28.5" y="40.5" width="7" height="8" fill={color} />
      {/* base */}
      <rect x="19" y="48" width="26" height="5" rx="2.5" fill={color} />
      <rect x="23" y="53" width="18" height="4.5" rx="1.6" fill={color} opacity="0.75" />
    </svg>
  )
}
