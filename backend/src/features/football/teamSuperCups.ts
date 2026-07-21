// Domestic super cup wins per club (api-football team id → season-start years,
// most recent first). One clean source for the honours model's domesticSuperCup
// field — the count is the array length, so the two can never drift apart.
//
// Years follow Transfermarkt's season-start convention (verified against TM's own
// season labels + Wikipedia): the January Supercopa de España editions (2020+),
// the pre-1974 French "Challenge des Champions", and the pre-2006 Turkish
// Presidential Cup all sit under the earlier season (a -1 vs the Wikipedia
// calendar year). The FA Community Shield COUNTS SHARED (drawn) shields for both
// clubs, matching how Transfermarkt tallies them.

export const TEAM_SUPER_CUP: Record<number, number[]> = {
  // ── Supercopa de España ──────────────────────────────────────────────
  529: [2025, 2024, 2022, 2018, 2016, 2013, 2011, 2010, 2009, 2006, 2005, 1996, 1994, 1992, 1991, 1983], // Barcelona
  541: [2023, 2021, 2019, 2017, 2012, 2008, 2003, 2001, 1997, 1993, 1990, 1989, 1988], // Real Madrid
  531: [2020, 2015, 1984], // Athletic Club
  544: [2002, 2000, 1995], // Deportivo La Coruña
  530: [2014, 1985], // Atlético Madrid
  532: [1999], // Valencia
  536: [2007], // Sevilla
  548: [1982], // Real Sociedad
  798: [1998], // Mallorca

  // ── FA Community Shield (shared shields included, TM-style) ───────────
  33: [2016, 2013, 2011, 2010, 2008, 2007, 2003, 1997, 1996, 1994, 1993, 1990, 1983, 1977, 1967, 1965, 1957, 1956, 1952, 1911, 1908], // Manchester United
  42: [2023, 2020, 2017, 2015, 2014, 2004, 2002, 1999, 1998, 1991, 1953, 1948, 1938, 1934, 1933, 1931, 1930], // Arsenal
  40: [2022, 2006, 2001, 1990, 1989, 1988, 1986, 1982, 1980, 1979, 1977, 1976, 1974, 1966, 1965, 1964], // Liverpool
  45: [1995, 1987, 1986, 1985, 1984, 1970, 1963, 1932, 1928], // Everton
  50: [2024, 2019, 2018, 2012, 1972, 1968, 1937], // Manchester City
  47: [1991, 1981, 1967, 1962, 1961, 1951, 1921], // Tottenham Hotspur
  49: [2009, 2005, 2000, 1955], // Chelsea
  39: [1960, 1959, 1954, 1949], // Wolves
  63: [1992, 1969], // Leeds
  44: [1973, 1960], // Burnley
  34: [1909], // Newcastle
  65: [1978], // Nottingham Forest
  52: [2025], // Crystal Palace
  746: [1936], // Sunderland
  48: [1964], // West Ham (shared)
  66: [1981], // Aston Villa (shared)

  // ── DFL-Supercup (official DFB/DFL editions) ─────────────────────────
  157: [2025, 2022, 2021, 2020, 2018, 2017, 2016, 2012, 2010, 1990, 1987], // Bayern München
  165: [2019, 2014, 2013, 1996, 1995, 1989], // Borussia Dortmund
  162: [1994, 1993, 1988], // Werder Bremen
  161: [2015], // VfL Wolfsburg
  168: [2024], // Bayer Leverkusen
  172: [1992], // VfB Stuttgart
  173: [2023], // RB Leipzig
  174: [2011], // Schalke 04

  // ── Supercoppa Italiana ──────────────────────────────────────────────
  496: [2020, 2018, 2015, 2013, 2012, 2003, 2002, 1997, 1995], // Juventus
  489: [2024, 2016, 2011, 2004, 1994, 1993, 1992, 1988], // AC Milan
  505: [2023, 2022, 2021, 2010, 2008, 2006, 2005, 1989], // Inter
  487: [2019, 2017, 2009, 2000, 1998], // Lazio
  492: [2025, 2014, 1990], // Napoli
  497: [2007, 2001], // AS Roma
  502: [1996], // Fiorentina
  523: [1999], // Parma

  // ── Trophée des Champions ────────────────────────────────────────────
  85: [2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 1998, 1995], // Paris Saint-Germain
  80: [2012, 2007, 2006, 2005, 2004, 2003, 2002, 1972], // Lyon
  1063: [1968, 1967, 1966, 1961, 1956], // Saint-Étienne
  91: [2000, 1997, 1985, 1960], // Monaco
  81: [2011, 2010, 1970], // Marseille
  83: [2001, 1999, 1964], // Nantes
  79: [2021], // Lille
  84: [1969], // Nice
  94: [1970], // Rennes
  111: [1958], // Le Havre

  // ── Türkiye Süper Kupası (+ Cumhurbaşkanlığı Kupası) ─────────────────
  645: [2023, 2019, 2016, 2015, 2013, 2012, 2008, 1996, 1995, 1992, 1990, 1987, 1986, 1981, 1971, 1968, 1965], // Galatasaray
  549: [2024, 2021, 2006, 1997, 1993, 1991, 1988, 1985, 1973, 1966], // Beşiktaş
  611: [2025, 2014, 2009, 2007, 1989, 1984, 1983, 1974, 1972, 1967], // Fenerbahçe
  998: [2022, 2020, 2010, 1994, 1982, 1979, 1978, 1977, 1976, 1975], // Trabzonspor
  607: [2017], // Konyaspor
  994: [1969], // Göztepe
}
