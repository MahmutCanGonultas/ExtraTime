// Per-club accent colour, used for subtle theming on the team page (a soft glow
// behind the hero, a tinted crest ring). The accent is always a saturated,
// visible colour — for white/black-identity clubs (Real Madrid, Tottenham,
// Juventus, Beşiktaş…) it's their saturated secondary (gold, navy, red…) so the
// glow actually reads on the dark UI.
//
// Sourced from teamcolorcodes.com, cross-checked with Wikipedia club infoboxes.

// api-football team id → accent hex.
export const TEAM_ACCENT: Record<number, string> = {
  // Premier League
  33: '#DA291C', // Manchester United
  34: '#41B6E6', // Newcastle (sky; identity black/white)
  39: '#FDB913', // Wolves
  40: '#C8102E', // Liverpool
  42: '#EF0107', // Arsenal
  44: '#6C1D45', // Burnley
  45: '#003399', // Everton
  47: '#132257', // Tottenham (navy; identity white)
  48: '#7A263A', // West Ham
  49: '#034694', // Chelsea
  50: '#6CABDD', // Manchester City
  52: '#1B458F', // Crystal Palace
  57: '#3A64A3', // Ipswich Town
  63: '#1D428A', // Leeds (blue; identity white)
  65: '#DD0000', // Nottingham Forest
  66: '#670E36', // Aston Villa (claret)
  746: '#EB172B', // Sunderland
  1346: '#7BB8E7', // Coventry
  // Ligue 1
  79: '#E01E13', // Lille
  80: '#DA0812', // Lyon (red; identity white)
  81: '#2FAEE0', // Marseille (azur)
  83: '#FCD405', // Nantes
  84: '#C8102E', // Nice
  85: '#004170', // Paris Saint-Germain
  91: '#CE1126', // Monaco
  94: '#E1211C', // Rennes
  95: '#009EE0', // Strasbourg
  96: '#7D3F98', // Toulouse
  97: '#FF7900', // Lorient
  104: '#008B4C', // Red Star FC
  108: '#0055A4', // Auxerre
  111: '#004A97', // Le Havre
  112: '#8E1F2E', // Metz
  116: '#E20613', // Lens
  1063: '#009651', // Saint-Étienne (green; identity white)
  // Bundesliga
  157: '#DC052D', // Bayern München
  161: '#65B32E', // VfL Wolfsburg
  162: '#1D9053', // Werder Bremen
  163: '#009540', // Borussia Mönchengladbach
  165: '#FDE100', // Borussia Dortmund
  168: '#E32219', // Bayer Leverkusen
  169: '#E1000F', // Eintracht Frankfurt
  172: '#E30613', // VfB Stuttgart
  173: '#DD0741', // RB Leipzig
  174: '#004D9E', // Schalke 04
  175: '#0A3F86', // Hamburger SV (blue; identity white)
  192: '#ED1C24', // 1. FC Köln
  // Serie A
  487: '#87D8F7', // Lazio (celeste)
  489: '#FB090B', // AC Milan
  490: '#A5182B', // Cagliari
  492: '#12A0D7', // Napoli
  495: '#9F1C24', // Genoa
  496: '#C9A227', // Juventus (gold; identity black/white)
  497: '#8E1F2F', // AS Roma
  499: '#1961AC', // Atalanta
  500: '#9F1E32', // Bologna
  502: '#59259E', // Fiorentina (viola)
  503: '#881600', // Torino
  504: '#003B7C', // Hellas Verona
  505: '#0068A8', // Inter
  517: '#F5822A', // Venezia
  523: '#FDD100', // Parma
  // La Liga
  529: '#A50044', // Barcelona (blaugrana)
  530: '#CB3524', // Atlético Madrid
  531: '#EE2523', // Athletic Club
  532: '#F18E00', // Valencia
  533: '#FFE000', // Villarreal
  536: '#D81E05', // Sevilla
  540: '#0072CE', // Espanyol
  541: '#FEBE10', // Real Madrid (gold; identity white)
  543: '#009B3A', // Real Betis
  544: '#0067B1', // Deportivo La Coruña
  548: '#0067B1', // Real Sociedad
  798: '#E30613', // Mallorca
  // Süper Lig
  549: '#E00505', // Beşiktaş (official red; identity black/white)
  564: '#F58220', // İstanbul Başakşehir
  607: '#009A44', // Konyaspor
  611: '#FFED00', // Fenerbahçe (sarı; identity navy/yellow)
  645: '#FDB913', // Galatasaray (sarı)
  994: '#E30613', // Göztepe
  997: '#E4002B', // Gençlerbirliği
  998: '#7B1E3D', // Trabzonspor (bordo)
  1001: '#FDD000', // Kayserispor
  7411: '#00964B', // Kocaelispor
}

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
