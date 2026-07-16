import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Bracket,
  Fixture,
  FixtureGoal,
  League,
  StandingRow,
  Team,
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

export function useTeam(teamId: number) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => api.get<{ team: Team; fixtures: Fixture[] }>(`/teams/${teamId}`),
  })
}

export function useFixture(fixtureId: number) {
  return useQuery({
    queryKey: ['fixture', fixtureId],
    queryFn: () => api.get<{ fixture: Fixture; goals: FixtureGoal[] }>(`/fixtures/${fixtureId}`),
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
