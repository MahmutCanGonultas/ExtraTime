// Per-club accent colour, used for subtle theming on the team page (a soft glow
// behind the hero, a tinted crest ring). The accent is always a saturated,
// visible colour — for white/black-identity clubs it's their saturated secondary
// (gold, navy…) so the glow actually reads on the dark UI.
//
// This is a confident seed of the most iconic clubs; the rest fall back to the
// app's lime accent until the full, sourced set lands.

// api-football team id → accent hex.
export const TEAM_ACCENT: Record<number, string> = {
  40: '#c8102e', // Liverpool
  33: '#da291c', // Manchester United
  50: '#6cabdd', // Manchester City
  42: '#ef0107', // Arsenal
  49: '#034694', // Chelsea
  47: '#132257', // Tottenham (navy; identity white)
  45: '#003399', // Everton
  66: '#7a003c', // Aston Villa (claret)
  157: '#dc052d', // Bayern München
  165: '#fde100', // Borussia Dortmund
  173: '#dd0741', // RB Leipzig
  168: '#e32219', // Bayer Leverkusen
  169: '#e1000f', // Eintracht Frankfurt
  529: '#a50044', // Barcelona (blaugrana)
  541: '#febe10', // Real Madrid (gold; identity white)
  530: '#cb3524', // Atlético Madrid
  536: '#d81e05', // Sevilla
  505: '#0068a8', // Inter
  489: '#fb090b', // AC Milan
  492: '#12a0d7', // Napoli (azzurro)
  497: '#8e1f2f', // AS Roma (maroon)
  496: '#b8912a', // Juventus (gold; identity black/white)
  81: '#2faadc', // Marseille (azur)
  85: '#e30613', // Paris Saint-Germain (red pop over navy)
  645: '#fdb913', // Galatasaray (sarı-kırmızı → yellow)
  611: '#154284', // Fenerbahçe (lacivert)
  549: '#000000', // Beşiktaş — overridden below to a usable grey
  998: '#7a1f3d', // Trabzonspor (bordo)
}
// Beşiktaş's identity is black/white; use a light silver so the glow shows.
TEAM_ACCENT[549] = '#b8bcc4'

// The app's lime brand, used when a club has no dedicated accent yet.
const DEFAULT_ACCENT = '#c2f542'

export function teamAccent(apiId: number | null | undefined): string {
  return (apiId != null && TEAM_ACCENT[apiId]) || DEFAULT_ACCENT
}

// An 8-digit hex (color + alpha) for low-opacity fills. alpha is 0..1.
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}
