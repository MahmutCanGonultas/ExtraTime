import type { TeamHonours } from './teamTrophies'
import { TEAM_SUPER_CUP } from './teamSuperCups'

// The years (calendar year of the season) each honour was won, per club, keyed by
// API-Football team id. Sourced from Wikidata (free, structured). Coverage is
// best-effort — some clubs/competitions are missing, so this only enriches the
// trophy cabinet's "Detaylı" view; the authoritative counts live in teamTrophies.
export const TEAM_TROPHY_YEARS: Record<number, Partial<Record<keyof TeamHonours, number[]>>> = {
  33: { leagueTitles: [2012, 2010, 2008, 2007, 2006, 2002, 2000, 1999, 1998, 1996, 1995, 1993, 1992, 1966, 1964, 1956, 1955, 1951, 1910, 1907], domesticCups: [2023, 2015, 2003, 1998, 1995, 1993, 1989, 1984, 1982, 1976, 1962, 1947, 1908], championsLeague: [2007, 1998, 1967], europaLeague: [2016], cupWinnersCup: [1990], uefaSuperCup: [1991], clubWorldCup: [2008, 1999] },
  34: { leagueTitles: [1926, 1908, 1906, 1904], domesticCups: [1954, 1951, 1950, 1931, 1923, 1909] }, // count 4: removed spurious 1992
  39: { leagueTitles: [1958, 1957, 1953], domesticCups: [1959, 1948, 1907, 1892] },
  40: { leagueTitles: [2024, 2019, 1989, 1987, 1985, 1983, 1982, 1981, 1979, 1978, 1976, 1975, 1972, 1965, 1963, 1946, 1922, 1921, 1905, 1900], domesticCups: [2021, 2005, 2000, 1991, 1988, 1985, 1973, 1964], championsLeague: [2018, 2004, 1983, 1980, 1977, 1976], europaLeague: [2000, 1975, 1972], uefaSuperCup: [2019, 2001, 1977], clubWorldCup: [2019] },
  42: { leagueTitles: [2025, 2003, 2001, 1997, 1990, 1988, 1970, 1952, 1947, 1937, 1934, 1933, 1932, 1930], domesticCups: [2019, 2016, 2014, 2013, 2004, 2002, 2001, 1997, 1992, 1978, 1970, 1949, 1935, 1929], cupWinnersCup: [1993] },
  44: { leagueTitles: [1959, 1920], domesticCups: [1913] },
  45: { leagueTitles: [1986, 1984, 1969, 1962, 1938, 1931, 1927, 1914], domesticCups: [1994, 1983, 1965, 1932, 1905], cupWinnersCup: [1984] },
  47: { leagueTitles: [1960, 1950], domesticCups: [1990, 1981, 1980, 1966, 1961, 1960, 1920, 1900], europaLeague: [2024, 1983, 1971], cupWinnersCup: [1962] },
  48: { domesticCups: [1979, 1974, 1963], cupWinnersCup: [1964], conferenceLeague: [2022] },
  49: { leagueTitles: [2016, 2014, 2009, 2005, 2004, 1954], domesticCups: [2017, 2011, 2009, 2008, 2006, 1999, 1996, 1969], championsLeague: [2020, 2011], europaLeague: [2018, 2012], cupWinnersCup: [1997, 1970], conferenceLeague: [2024], uefaSuperCup: [1998], clubWorldCup: [2025, 2021] },
  50: { leagueTitles: [2023, 2022, 2021, 2020, 2018, 2017, 2013, 2011, 2001, 1967, 1936], domesticCups: [2025, 2022, 2018, 2010, 1968, 1955, 1933, 1903], championsLeague: [2022], cupWinnersCup: [1969], clubWorldCup: [2023] },
  52: { leagueTitles: [1993], domesticCups: [2024], conferenceLeague: [2025] },
  57: { leagueTitles: [1961], domesticCups: [1977], europaLeague: [1980] },
  63: { leagueTitles: [1991, 1973, 1968], domesticCups: [1971] },
  65: { leagueTitles: [1997, 1977], domesticCups: [1958, 1897], championsLeague: [1979, 1978], uefaSuperCup: [1979] },
  66: { leagueTitles: [1980, 1909, 1899, 1898, 1896, 1895, 1893], domesticCups: [1956, 1919, 1912, 1904, 1896, 1894, 1886], championsLeague: [1981], europaLeague: [2025], uefaSuperCup: [1982] },
  79: { leagueTitles: [2020, 2010, 1953, 1945], domesticCups: [2010, 1954, 1952, 1947, 1946, 1945] },
  80: { leagueTitles: [2007, 2006, 2005, 2004, 2003, 2002, 2001], domesticCups: [2011, 2007, 1972, 1966, 1963] },
  81: { leagueTitles: [2009, 1991, 1990, 1989, 1988, 1971, 1970, 1947, 1936], domesticCups: [1988, 1975, 1971, 1968, 1942, 1937, 1934, 1926, 1925, 1923], championsLeague: [1992] }, // count 9: removed the stripped 1992-93 title
  85: { leagueTitles: [2025, 2023, 2022, 2021, 2019, 2018, 2017, 2015, 2014, 2013, 2012, 1993, 1985], domesticCups: [2024, 2023, 2020, 2019, 2017, 2016, 2015, 2014, 2009, 2005, 2003, 1997, 1994, 1992, 1982, 1981], championsLeague: [2025, 2024], cupWinnersCup: [1995] },
  91: { leagueTitles: [2016, 1999, 1996, 1987, 1981, 1977, 1962, 1960], domesticCups: [1990, 1984, 1979, 1962, 1959] },
  94: { domesticCups: [2018, 1970, 1964] },
  95: { leagueTitles: [1978], domesticCups: [2000, 1965, 1950] },
  96: { domesticCups: [2022] },
  104: { domesticCups: [1941, 1927, 1922, 1921, 1920] },
  108: { leagueTitles: [1995], domesticCups: [2004, 2002, 1995, 1993] },
  111: { domesticCups: [1958] },
  116: { leagueTitles: [1997], domesticCups: [2025] },
  157: { leagueTitles: [2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2009, 2007, 2005, 2004, 2002, 2000, 1999, 1998, 1996, 1993, 1989, 1988, 1986, 1985, 1984, 1932], domesticCups: [2025, 2019, 2018, 2015, 2013, 2012, 2009, 2007, 2005, 2004, 2002, 1999, 1997, 1985, 1983, 1981, 1970, 1968, 1966, 1965, 1956], championsLeague: [2019, 2012, 2000, 1975, 1974, 1973], europaLeague: [1995], cupWinnersCup: [1966], uefaSuperCup: [2020, 2013], clubWorldCup: [2020, 2013, 2001, 1976] },
  161: { leagueTitles: [2008], domesticCups: [2014] },
  162: { leagueTitles: [2003, 1992, 1987], domesticCups: [2008, 2003, 1998, 1993, 1990, 1960], cupWinnersCup: [1991] },
  163: { domesticCups: [1994, 1972, 1959], europaLeague: [1978, 1974] },
  165: { leagueTitles: [2011, 2010, 2001, 1995, 1994, 1963, 1957, 1956], domesticCups: [2020, 2016, 2011, 1988, 1964], championsLeague: [1996], cupWinnersCup: [1965] },
  168: { domesticCups: [1992], europaLeague: [1987] },
  169: { leagueTitles: [1959], domesticCups: [2017, 1987, 1980, 1974, 1973], europaLeague: [2021, 1979] },
  172: { leagueTitles: [2006, 1991, 1983, 1952, 1950], domesticCups: [1996, 1957, 1953] },
  173: { domesticCups: [2022, 2021] },
  174: { leagueTitles: [1958, 1942, 1940, 1939, 1937, 1935, 1934], domesticCups: [2010, 2001, 2000, 1971, 1937], europaLeague: [1996] },
  175: { leagueTitles: [1981, 1978] },
  192: { leagueTitles: [1962], domesticCups: [1982, 1977, 1976, 1967] },
  487: { domesticCups: [2018, 2012, 2008, 2003, 1999, 1997, 1958], cupWinnersCup: [1998], uefaSuperCup: [1999] },
  489: { leagueTitles: [2021, 2010, 2003, 1998, 1995, 1993, 1992, 1991, 1987, 1978, 1967, 1961, 1958, 1956, 1954, 1950, 1907, 1906, 1901], domesticCups: [2002, 1976, 1972, 1971, 1966], championsLeague: [2006, 2002, 1993, 1989, 1988, 1968, 1962], cupWinnersCup: [1972, 1967], uefaSuperCup: [2007, 2003, 1994, 1990, 1989], clubWorldCup: [2007, 1990, 1989, 1969] }, // AC Milan — leagueTitles from Wikidata (19), Super Cup completed to 5
  492: { domesticCups: [2019, 2013, 2011, 1986, 1975, 1961], europaLeague: [1988] },
  495: { domesticCups: [1936] },
  496: { domesticCups: [2020, 2017, 2016, 2015, 2014, 1994, 1989, 1982, 1978, 1964, 1959, 1958, 1941, 1937], championsLeague: [1995, 1984], europaLeague: [1992, 1989, 1976], cupWinnersCup: [1983], uefaSuperCup: [1996, 1984], clubWorldCup: [1996, 1985] },
  497: { leagueTitles: [2025] },
  499: { domesticCups: [1962], europaLeague: [2023] },
  500: { domesticCups: [1973, 1969] },
  502: { domesticCups: [2000, 1995, 1974, 1965, 1960, 1939], cupWinnersCup: [1960] },
  503: { domesticCups: [1992, 1970, 1967, 1942, 1935] },
  505: { domesticCups: [2025, 2022, 2021, 2010, 2009, 2005, 2004, 1981, 1977, 1938], championsLeague: [2009, 1964, 1963], europaLeague: [1997, 1993, 1990], clubWorldCup: [2010, 1965, 1964] },
  523: { domesticCups: [2001, 1998, 1991], europaLeague: [1998, 1994], cupWinnersCup: [1992], uefaSuperCup: [1993] },
  529: { leagueTitles: [2025, 2024, 2022, 2018, 2017, 2015, 2014, 2012, 2010, 2009, 2008, 2005, 2004, 1998, 1997, 1993, 1992, 1991, 1990, 1984, 1973, 1959, 1958, 1952, 1951, 1948, 1947, 1944, 1929], domesticCups: [2024, 2020, 2017, 2016, 2015, 2014, 2011, 2008, 1997, 1996, 1989, 1987, 1982, 1980, 1977, 1970, 1967, 1962, 1958, 1957, 1952, 1951, 1942, 1928, 1926, 1925, 1922, 1920, 1913, 1912, 1910], championsLeague: [2014, 2010, 2008, 2005, 1991], cupWinnersCup: [1996, 1988, 1981, 1978], uefaSuperCup: [2015, 2011, 2009, 1997, 1992], clubWorldCup: [2015, 2011, 2009] },
  530: { leagueTitles: [2020, 2013, 1995, 1976, 1972, 1969, 1965, 1950, 1949, 1940, 1939], domesticCups: [2012, 1995, 1991, 1990, 1984, 1975, 1971, 1964, 1960, 1959], europaLeague: [2017, 2011, 2009], cupWinnersCup: [1961], uefaSuperCup: [2018, 2012, 2010], clubWorldCup: [1974] },
  531: { leagueTitles: [1983, 1982, 1955, 1942, 1935, 1933, 1930, 1929], domesticCups: [2023, 1983, 1972, 1969, 1958, 1956, 1955, 1949, 1944, 1943, 1933, 1932, 1931, 1930, 1923, 1921, 1916, 1915, 1914, 1911, 1910, 1904, 1903] },
  533: { europaLeague: [2020] },
  536: { leagueTitles: [1945], domesticCups: [2009, 2006, 1947, 1939, 1935], europaLeague: [2022, 2019, 2015, 2014, 2013, 2006, 2005] },
  540: { domesticCups: [2005, 1999, 1940, 1928] },
  541: { leagueTitles: [2023, 2021, 2019, 2016, 2011, 2007, 2006, 2002, 2000, 1996, 1994, 1989, 1988, 1987, 1986, 1985, 1979, 1978, 1977, 1975, 1974, 1971, 1968, 1967, 1966, 1964, 1963, 1962, 1961, 1960, 1957, 1956, 1954, 1953, 1932, 1931], domesticCups: [2022, 2013, 2010, 1992, 1988, 1981, 1979, 1974, 1973, 1969, 1961, 1947, 1946, 1936, 1934, 1917, 1908, 1907, 1906, 1905], championsLeague: [2023, 2021, 2017, 2016, 2015, 2013, 2001, 1999, 1997, 1965, 1959, 1958, 1957, 1956, 1955], europaLeague: [1985, 1984], uefaSuperCup: [2024, 2022, 2017, 2016, 2014, 2002], clubWorldCup: [2024, 2022, 2018, 2017, 2016, 2014, 2002, 1998, 1960] },
  543: { leagueTitles: [2014, 1934], domesticCups: [2021, 2004, 1976] },
  544: { leagueTitles: [1999], domesticCups: [2001, 1994] },
  548: { leagueTitles: [1981, 1980], domesticCups: [2025, 2019, 1986] },
  549: { leagueTitles: [2016, 2015, 2008, 2002, 1994, 1991, 1990, 1989, 1985, 1981, 1966, 1965, 1959], domesticCups: [2020, 2010, 2008, 2006, 2005, 1997, 1989, 1988, 1974] },
  607: { domesticCups: [2016] },
  611: { leagueTitles: [2013, 2010, 2006, 2004, 2003, 2000, 1995, 1988, 1984, 1982, 1977, 1974, 1973, 1969, 1967, 1964, 1963, 1960, 1959], domesticCups: [2012, 2011] },
  645: { leagueTitles: [2018, 2017, 2014, 2012, 2011, 2007, 2005, 2001, 1999, 1998, 1997, 1996, 1993, 1992, 1987, 1986, 1972, 1971, 1970, 1968, 1962, 1961], domesticCups: [2018, 2015, 2014, 2013, 2004, 1999, 1998, 1995, 1965], europaLeague: [1999], uefaSuperCup: [2000] },
  746: { leagueTitles: [1998, 1995, 1935, 1912, 1901, 1894, 1892], domesticCups: [1972, 1936] },
  798: { domesticCups: [2002] },
  997: { domesticCups: [2000] },
  998: { leagueTitles: [1983, 1980, 1979, 1978, 1976, 1975], domesticCups: [2019, 2009, 2003, 2002, 1994] },
  1001: { domesticCups: [2007] },
  1063: { leagueTitles: [1980, 1975, 1974, 1973, 1969, 1968, 1967, 1966, 1963, 1956], domesticCups: [1976, 1974, 1973, 1969, 1967, 1961] },
  1346: { domesticCups: [1986] },
  7411: { domesticCups: [2001, 1996] },
  // Clubs that had counts but no year detail — filled with their major-honour years
  // (season-START year, matching this file's convention), each array length verified
  // against the curated count in teamTrophies.
  83: {
    leagueTitles: [2000, 1994, 1982, 1979, 1976, 1972, 1965, 1964],
    domesticCups: [2021, 1999, 1998, 1978],
  }, // Nantes (8 + 4)
  84: { leagueTitles: [1958, 1955, 1951, 1950], domesticCups: [1996, 1953, 1951] }, // Nice (4 + 3)
  97: { domesticCups: [2001] }, // Lorient
  112: { domesticCups: [1987, 1983] }, // Metz
  490: { leagueTitles: [1969] }, // Cagliari
  504: { leagueTitles: [1984] }, // Hellas Verona
  517: { domesticCups: [1940] }, // Venezia
  532: {
    leagueTitles: [2003, 2001, 1970, 1946, 1943, 1941],
    domesticCups: [2018, 2007, 1998, 1978, 1966, 1953, 1948, 1940],
    europaLeague: [2003],
    cupWinnersCup: [1979],
    uefaSuperCup: [2004, 1980],
  }, // Valencia (6 + 8 + 1 + 1 + 2)
  564: { leagueTitles: [2019] }, // İstanbul Başakşehir
  994: { domesticCups: [1969, 1968] }, // Göztepe
}

export function getTeamHonourYears(
  apiFootballId: number,
): Partial<Record<keyof TeamHonours, number[]>> | null {
  const base = TEAM_TROPHY_YEARS[apiFootballId]
  const superCup = TEAM_SUPER_CUP[apiFootballId]
  if (!base && !superCup) return null
  return { ...(base ?? {}), ...(superCup ? { domesticSuperCup: superCup } : {}) }
}
