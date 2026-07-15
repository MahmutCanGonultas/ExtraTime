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
