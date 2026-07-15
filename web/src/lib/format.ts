// User-facing dates are always shown in Turkey time, in Turkish, regardless of
// the viewer's own timezone. Times are stored/compared in UTC on the server.
const TZ = 'Europe/Istanbul'

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TZ,
  }).format(new Date(iso))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: TZ }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short', timeZone: TZ }).format(new Date(iso))
}

export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: TZ }).format(new Date(iso))
}

// Team and league logos come from the media server (not counted against the
// API request limit) and are addressed purely by their API-Football id.
export function teamLogoUrl(apiFootballId: number): string {
  return `https://media.api-sports.io/football/teams/${apiFootballId}.png`
}

export function leagueLogoUrl(apiFootballId: number): string {
  return `https://media.api-sports.io/football/leagues/${apiFootballId}.png`
}

export function playerPhotoUrl(playerApiId: number): string {
  return `https://media.api-sports.io/football/players/${playerApiId}.png`
}

export type Outcome = 'HOME' | 'DRAW' | 'AWAY'

// A short human label for a 1X2 pick, given the two team names.
export function outcomeLabel(outcome: Outcome, homeName: string, awayName: string): string {
  if (outcome === 'HOME') return `${homeName} kazanır`
  if (outcome === 'AWAY') return `${awayName} kazanır`
  return 'Beraberlik'
}

// The badge shown on a live match: "45+2'", "Devre", "67'", or "Canlı".
export function liveMinuteLabel(status: string, elapsed: number | null): string {
  if (status === 'HT') return 'Devre'
  if (status === 'P') return 'Penaltılar'
  if (status === 'BT') return 'Uzatma arası'
  if (elapsed != null) return `${elapsed}'`
  return 'Canlı'
}
