// Curated all-time major-honour counts per club, keyed by API-Football team id.
// API-Football has no team-honours endpoint, so this is compiled from research
// (Wikipedia "Honours", verified per-club for the prominent clubs). Senior men's
// first team, major trophies only, as of the end of the 2024-25 season.

import { TEAM_SUPER_CUP } from './teamSuperCups'

export interface TeamHonours {
  leagueTitles: number // top-flight domestic league titles
  domesticCups: number // main national cup (FA Cup / Copa del Rey / Coppa Italia / DFB-Pokal / Coupe de France / Türkiye Kupası)
  championsLeague: number // European Cup + UEFA Champions League
  europaLeague: number // UEFA Cup + UEFA Europa League
  cupWinnersCup: number // UEFA Cup Winners' Cup (defunct)
  conferenceLeague: number // UEFA (Europa) Conference League
  uefaSuperCup: number
  clubWorldCup: number // FIFA Club World Cup + Intercontinental Cup
  // Domestic super cup: Supercopa de España / FA Community Shield / DFL-Supercup /
  // Supercoppa Italiana / Trophée des Champions / TFF Süper Kupa. Optional — filled
  // per club as the data is completed.
  domesticSuperCup?: number
}

// Clubs absent here simply show no trophy cabinet.
export const TEAM_TROPHIES: Record<number, TeamHonours> = {
  33: { leagueTitles: 20, domesticCups: 13, championsLeague: 3, europaLeague: 1, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 2 }, // Manchester United
  34: { leagueTitles: 4, domesticCups: 6, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Newcastle
  39: { leagueTitles: 3, domesticCups: 4, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Wolves
  40: { leagueTitles: 20, domesticCups: 8, championsLeague: 6, europaLeague: 3, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 4, clubWorldCup: 1 }, // Liverpool
  42: { leagueTitles: 13, domesticCups: 14, championsLeague: 0, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Arsenal
  44: { leagueTitles: 2, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Burnley
  45: { leagueTitles: 9, domesticCups: 5, championsLeague: 0, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Everton
  47: { leagueTitles: 2, domesticCups: 8, championsLeague: 0, europaLeague: 3, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Tottenham Hotspur
  48: { leagueTitles: 0, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 1, uefaSuperCup: 0, clubWorldCup: 0 }, // West Ham United
  49: { leagueTitles: 6, domesticCups: 8, championsLeague: 2, europaLeague: 2, cupWinnersCup: 2, conferenceLeague: 1, uefaSuperCup: 2, clubWorldCup: 2 }, // Chelsea
  50: { leagueTitles: 10, domesticCups: 7, championsLeague: 1, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 1 }, // Manchester City
  52: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Crystal Palace
  57: { leagueTitles: 1, domesticCups: 1, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Ipswich Town
  63: { leagueTitles: 3, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Leeds
  65: { leagueTitles: 1, domesticCups: 2, championsLeague: 2, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 0 }, // Nottingham Forest
  66: { leagueTitles: 7, domesticCups: 7, championsLeague: 1, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 0 }, // Aston Villa
  79: { leagueTitles: 4, domesticCups: 6, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Lille
  80: { leagueTitles: 7, domesticCups: 5, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Lyon
  81: { leagueTitles: 9, domesticCups: 10, championsLeague: 1, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Marseille
  83: { leagueTitles: 8, domesticCups: 4, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Nantes
  84: { leagueTitles: 4, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Nice
  85: { leagueTitles: 13, domesticCups: 16, championsLeague: 1, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Paris Saint-Germain
  91: { leagueTitles: 8, domesticCups: 5, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Monaco
  94: { leagueTitles: 0, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Rennes
  95: { leagueTitles: 1, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Strasbourg
  96: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Toulouse
  97: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Lorient
  104: { leagueTitles: 0, domesticCups: 5, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Red Star FC 93
  108: { leagueTitles: 1, domesticCups: 4, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Auxerre
  111: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Le Havre
  112: { leagueTitles: 0, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Metz
  116: { leagueTitles: 1, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Lens
  157: { leagueTitles: 34, domesticCups: 20, championsLeague: 6, europaLeague: 1, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 2, clubWorldCup: 4 }, // Bayern München
  161: { leagueTitles: 1, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // VfL Wolfsburg
  162: { leagueTitles: 4, domesticCups: 6, championsLeague: 0, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Werder Bremen
  163: { leagueTitles: 5, domesticCups: 3, championsLeague: 0, europaLeague: 2, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Borussia Mönchengladbach
  165: { leagueTitles: 8, domesticCups: 5, championsLeague: 1, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 1 }, // Borussia Dortmund
  168: { leagueTitles: 1, domesticCups: 2, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Bayer Leverkusen
  169: { leagueTitles: 1, domesticCups: 5, championsLeague: 0, europaLeague: 2, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Eintracht Frankfurt
  172: { leagueTitles: 5, domesticCups: 4, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // VfB Stuttgart
  173: { leagueTitles: 0, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // RB Leipzig
  174: { leagueTitles: 7, domesticCups: 5, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // FC Schalke 04
  175: { leagueTitles: 6, domesticCups: 3, championsLeague: 1, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Hamburger SV
  192: { leagueTitles: 3, domesticCups: 4, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // 1. FC Köln
  487: { leagueTitles: 2, domesticCups: 7, championsLeague: 0, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 0 }, // Lazio
  489: { leagueTitles: 19, domesticCups: 5, championsLeague: 7, europaLeague: 0, cupWinnersCup: 2, conferenceLeague: 0, uefaSuperCup: 5, clubWorldCup: 4 }, // AC Milan
  490: { leagueTitles: 1, domesticCups: 0, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Cagliari
  492: { leagueTitles: 4, domesticCups: 6, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Napoli
  495: { leagueTitles: 9, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Genoa
  496: { leagueTitles: 36, domesticCups: 15, championsLeague: 2, europaLeague: 3, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 2, clubWorldCup: 2 }, // Juventus
  497: { leagueTitles: 3, domesticCups: 9, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 1, uefaSuperCup: 0, clubWorldCup: 0 }, // AS Roma
  499: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Atalanta
  500: { leagueTitles: 7, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Bologna
  502: { leagueTitles: 2, domesticCups: 6, championsLeague: 0, europaLeague: 0, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Fiorentina
  503: { leagueTitles: 7, domesticCups: 5, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Torino
  504: { leagueTitles: 1, domesticCups: 0, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Hellas Verona
  505: { leagueTitles: 20, domesticCups: 9, championsLeague: 3, europaLeague: 3, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 3 }, // Inter
  517: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Venezia
  523: { leagueTitles: 0, domesticCups: 3, championsLeague: 0, europaLeague: 2, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 0 }, // Parma
  529: { leagueTitles: 29, domesticCups: 32, championsLeague: 5, europaLeague: 0, cupWinnersCup: 4, conferenceLeague: 0, uefaSuperCup: 5, clubWorldCup: 3 }, // Barcelona
  530: { leagueTitles: 11, domesticCups: 10, championsLeague: 0, europaLeague: 3, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 3, clubWorldCup: 1 }, // Atletico Madrid
  531: { leagueTitles: 8, domesticCups: 24, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Athletic Club
  532: { leagueTitles: 6, domesticCups: 8, championsLeague: 0, europaLeague: 1, cupWinnersCup: 1, conferenceLeague: 0, uefaSuperCup: 2, clubWorldCup: 0 }, // Valencia
  533: { leagueTitles: 0, domesticCups: 0, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Villarreal
  536: { leagueTitles: 1, domesticCups: 5, championsLeague: 0, europaLeague: 7, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 0 }, // Sevilla
  540: { leagueTitles: 0, domesticCups: 4, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Espanyol
  541: { leagueTitles: 36, domesticCups: 20, championsLeague: 15, europaLeague: 2, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 6, clubWorldCup: 9 }, // Real Madrid
  543: { leagueTitles: 1, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Real Betis
  544: { leagueTitles: 1, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Deportivo La Coruna
  548: { leagueTitles: 2, domesticCups: 3, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Real Sociedad
  549: { leagueTitles: 16, domesticCups: 11, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Beşiktaş
  564: { leagueTitles: 1, domesticCups: 0, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Istanbul Basaksehir
  607: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Konyaspor
  611: { leagueTitles: 19, domesticCups: 7, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Fenerbahçe
  645: { leagueTitles: 25, domesticCups: 19, championsLeague: 0, europaLeague: 1, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 1, clubWorldCup: 0 }, // Galatasaray
  746: { leagueTitles: 6, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Sunderland
  798: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Mallorca
  994: { leagueTitles: 0, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Goztepe
  997: { leagueTitles: 0, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Genclerbirligi
  998: { leagueTitles: 7, domesticCups: 10, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Trabzonspor
  1001: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Kayserispor
  1063: { leagueTitles: 10, domesticCups: 6, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Saint-Étienne
  1346: { leagueTitles: 0, domesticCups: 1, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Coventry
  7411: { leagueTitles: 0, domesticCups: 2, championsLeague: 0, europaLeague: 0, cupWinnersCup: 0, conferenceLeague: 0, uefaSuperCup: 0, clubWorldCup: 0 }, // Kocaelispor
}

export function getTeamHonours(apiFootballId: number): TeamHonours | null {
  const base = TEAM_TROPHIES[apiFootballId]
  if (!base) return null
  const superCup = TEAM_SUPER_CUP[apiFootballId]
  return superCup?.length ? { ...base, domesticSuperCup: superCup.length } : base
}
