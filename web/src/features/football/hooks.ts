import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Bracket,
  Fixture,
  FixtureGoal,
  GamePoolPlayer,
  GuessPoolPlayer,
  League,
  MatchEvent,
  MatchStat,
  PlayerCareer,
  PlayerProfile,
  PlayerRow,
  SearchResults,
  StandingRow,
  TeamDetail,
  TeamSquadHistory,
  TopAssist,
  TopScorer,
} from './types'

type FixtureFilter = 'upcoming' | 'finished' | 'all'

export function useLeagues(activeOnly = false) {
  return useQuery({
    queryKey: ['leagues', { activeOnly }],
    queryFn: () => api.get<{ leagues: League[] }>(`/leagues${activeOnly ? '?active=true' : ''}`),
    select: (d) => d.leagues,
  })
}

export function useStandings(leagueId: number) {
  return useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => api.get<{ standings: StandingRow[] }>(`/leagues/${leagueId}/standings`),
    select: (d) => d.standings,
  })
}

export function useLeagueFixtures(leagueId: number, filter: FixtureFilter = 'all') {
  return useQuery({
    queryKey: ['fixtures', leagueId, filter],
    queryFn: () =>
      api.get<{ fixtures: Fixture[] }>(`/leagues/${leagueId}/fixtures?status=${filter}`),
    select: (d) => d.fixtures,
  })
}

export function useBracket(leagueId: number) {
  return useQuery({
    queryKey: ['bracket', leagueId],
    queryFn: () => api.get<{ bracket: Bracket }>(`/leagues/${leagueId}/bracket`),
    select: (d) => d.bracket,
  })
}

export function useTopScorers(leagueId: number) {
  return useQuery({
    queryKey: ['topscorers', leagueId],
    queryFn: () => api.get<{ topscorers: TopScorer[] }>(`/leagues/${leagueId}/topscorers`),
    select: (d) => d.topscorers,
  })
}

export function useTopAssists(leagueId: number) {
  return useQuery({
    queryKey: ['topassists', leagueId],
    queryFn: () => api.get<{ topassists: TopAssist[] }>(`/leagues/${leagueId}/topassists`),
    select: (d) => d.topassists,
  })
}

export function useLeaguePlayers(leagueId: number) {
  return useQuery({
    queryKey: ['players', 'league', leagueId],
    queryFn: () => api.get<{ players: PlayerRow[] }>(`/leagues/${leagueId}/players`),
    select: (d) => d.players,
  })
}

export function useGamePool() {
  return useQuery({
    queryKey: ['game-pool'],
    queryFn: () => api.get<{ players: GamePoolPlayer[] }>('/players/game/pool'),
    select: (d) => d.players,
    staleTime: 60_000,
  })
}

export function useGuessPool(leagues: number[], clubs: number[]) {
  const qs = `leagues=${leagues.join(',')}&clubs=${clubs.join(',')}`
  return useQuery({
    queryKey: ['guess-pool', qs],
    queryFn: () => api.get<{ players: GuessPoolPlayer[] }>(`/players/guess/pool?${qs}`),
    select: (d) => d.players,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    // Keep the previous pool on screen while a new league/club toggle refetches, so
    // editing the pool doesn't blank the whole page (and the controls) to a skeleton.
    placeholderData: (prev) => prev,
    enabled: leagues.length > 0 || clubs.length > 0,
  })
}

export function useGuessSearch(term: string) {
  const q = term.trim()
  return useQuery({
    queryKey: ['guess-search', q],
    queryFn: () => api.get<{ players: GuessPoolPlayer[] }>(`/players/guess/search?q=${encodeURIComponent(q)}`),
    select: (d) => d.players,
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}

export function usePlayer(playerApiId: number) {
  return useQuery({
    queryKey: ['player', playerApiId],
    queryFn: () => api.get<{ player: PlayerProfile }>(`/players/${playerApiId}`),
    select: (d) => d.player,
    enabled: Number.isFinite(playerApiId) && playerApiId > 0,
  })
}

// Full career clubs. The first request may take a beat (backend lazily fetches the
// transfer history once, then caches it) — cached long after.
export function usePlayerCareer(playerApiId: number) {
  return useQuery({
    queryKey: ['player-career', playerApiId],
    queryFn: () => api.get<{ career: PlayerCareer }>(`/players/${playerApiId}/career`),
    select: (d) => d.career,
    staleTime: 24 * 60 * 60_000,
    enabled: Number.isFinite(playerApiId) && playerApiId > 0,
  })
}

export function useTeam(teamId: number) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => api.get<TeamDetail>(`/teams/${teamId}`),
  })
}

export function useTeamSquad(teamId: number, season?: number) {
  return useQuery({
    queryKey: ['team-squad', teamId, season ?? 'latest'],
    queryFn: () =>
      api.get<TeamSquadHistory>(`/teams/${teamId}/squad${season ? `?season=${season}` : ''}`),
    enabled: teamId > 0,
  })
}

export function useSearch(term: string) {
  const q = term.trim()
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}

export function useFixture(fixtureId: number) {
  return useQuery({
    queryKey: ['fixture', fixtureId],
    queryFn: () =>
      api.get<{ fixture: Fixture; goals: FixtureGoal[]; events: MatchEvent[]; stats: MatchStat[] }>(
        `/fixtures/${fixtureId}`,
      ),
    // Refresh the detail while the match is live so the score/goals stay current.
    refetchInterval: (q) => {
      const s = q.state.data?.fixture.status
      return s && ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(s) ? 20_000 : false
    },
  })
}

export function useLiveFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'live'],
    queryFn: () => api.get<{ fixtures: Fixture[] }>('/fixtures/live'),
    select: (d) => d.fixtures,
    refetchInterval: 20_000, // live matches: refresh every 20s
  })
}

export function useUpcomingFixtures(limit = 12) {
  return useQuery({
    queryKey: ['fixtures', 'upcoming', limit],
    queryFn: () => api.get<{ fixtures: Fixture[] }>(`/fixtures/upcoming?limit=${limit}`),
    select: (d) => d.fixtures,
  })
}

export function useRecentFixtures(limit = 12) {
  return useQuery({
    queryKey: ['fixtures', 'recent', limit],
    queryFn: () => api.get<{ fixtures: Fixture[] }>(`/fixtures/recent?limit=${limit}`),
    select: (d) => d.fixtures,
  })
}
