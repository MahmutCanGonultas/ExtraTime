import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Champion,
  FixturePredictions,
  GameFixture,
  GroupDetail,
  GroupSummary,
  LeaderboardEntry,
  MyPrediction,
  Outcome,
  SeasonDetail,
  SeasonRef,
  SeasonSummary,
  SettledPoint,
} from './types'

export function useMyGroups() {
  return useQuery({
    queryKey: ['my-groups'],
    queryFn: () => api.get<{ groups: GroupSummary[] }>('/groups'),
    select: (d) => d.groups,
  })
}

export function useGroup(id: number) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => api.get<{ group: GroupDetail }>(`/groups/${id}`),
    select: (d) => d.group,
    enabled: id > 0,
  })
}

export function useLeaderboard(groupId: number) {
  return useQuery({
    queryKey: ['leaderboard', groupId],
    queryFn: () => api.get<{ leaderboard: LeaderboardEntry[] }>(`/groups/${groupId}/leaderboard`),
    select: (d) => d.leaderboard,
    enabled: groupId > 0,
  })
}

export function useMyPredictions(groupId: number) {
  return useQuery({
    queryKey: ['my-predictions', groupId],
    queryFn: () => api.get<{ predictions: MyPrediction[] }>(`/groups/${groupId}/predictions`),
    select: (d) => d.predictions,
    enabled: groupId > 0,
  })
}

export function useFixturePredictions(groupId: number, fixtureId: number) {
  return useQuery({
    queryKey: ['fixture-predictions', groupId, fixtureId],
    queryFn: () =>
      api.get<FixturePredictions>(`/groups/${groupId}/fixtures/${fixtureId}/predictions`),
    enabled: groupId > 0 && fixtureId > 0,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ group: { id: number; name: string; inviteCode: string } }>('/groups', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-groups'] }),
  })
}

export function useJoinGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) =>
      api.post<{ group: { id: number; name: string } }>('/groups/join', { inviteCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-groups'] }),
  })
}

export function useUpsertPrediction(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      fixtureId: number
      outcome: Outcome
      predictedHome?: number | null
      predictedAway?: number | null
    }) =>
      api.put(`/groups/${groupId}/predictions/${input.fixtureId}`, {
        outcome: input.outcome,
        predictedHome: input.predictedHome ?? null,
        predictedAway: input.predictedAway ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-predictions', groupId] })
      qc.invalidateQueries({ queryKey: ['group-fixtures', groupId] })
      qc.invalidateQueries({ queryKey: ['leaderboard', groupId] })
    },
  })
}

// ---- The group's current game: curated matches, ending, history ----

export function useGroupFixtures(groupId: number) {
  return useQuery({
    queryKey: ['group-fixtures', groupId],
    queryFn: () => api.get<{ fixtures: GameFixture[] }>(`/groups/${groupId}/fixtures`),
    select: (d) => d.fixtures,
    enabled: groupId > 0,
  })
}

export function useCandidateFixtures(groupId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['candidate-fixtures', groupId],
    queryFn: () => api.get<{ fixtures: GameFixture[] }>(`/groups/${groupId}/candidate-fixtures`),
    select: (d) => d.fixtures,
    enabled: enabled && groupId > 0,
  })
}

export function useAddGroupFixture(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: number) => api.post(`/groups/${groupId}/fixtures`, { fixtureId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-fixtures', groupId] })
      qc.invalidateQueries({ queryKey: ['candidate-fixtures', groupId] })
    },
  })
}

export function useRemoveGroupFixture(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: number) => api.del(`/groups/${groupId}/fixtures/${fixtureId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-fixtures', groupId] })
      qc.invalidateQueries({ queryKey: ['candidate-fixtures', groupId] })
      qc.invalidateQueries({ queryKey: ['leaderboard', groupId] })
    },
  })
}

export function useFinishGame(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ champion: Champion | null }>(`/groups/${groupId}/finish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] })
      qc.invalidateQueries({ queryKey: ['group-seasons', groupId] })
    },
  })
}

export function useNewGame(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) =>
      api.post<{ season: SeasonRef }>(`/groups/${groupId}/new-game`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] })
      qc.invalidateQueries({ queryKey: ['group-seasons', groupId] })
      qc.invalidateQueries({ queryKey: ['group-fixtures', groupId] })
      qc.invalidateQueries({ queryKey: ['leaderboard', groupId] })
    },
  })
}

export function useSeasons(groupId: number) {
  return useQuery({
    queryKey: ['group-seasons', groupId],
    queryFn: () => api.get<{ seasons: SeasonSummary[] }>(`/groups/${groupId}/seasons`),
    select: (d) => d.seasons,
    enabled: groupId > 0,
  })
}

export function useSeasonDetail(groupId: number, seasonId: number | null) {
  return useQuery({
    queryKey: ['group-season', groupId, seasonId],
    queryFn: () => api.get<SeasonDetail>(`/groups/${groupId}/seasons/${seasonId}`),
    enabled: groupId > 0 && seasonId != null,
  })
}

export function useRegenerateInvite(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ inviteCode: string }>(`/groups/${groupId}/regenerate-invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
  })
}

export function useGroupStats(groupId: number) {
  return useQuery({
    queryKey: ['group-stats', groupId],
    queryFn: () => api.get<{ settled: SettledPoint[] }>(`/groups/${groupId}/stats`),
    select: (d) => d.settled,
    enabled: groupId > 0,
  })
}

export function useRemoveMember(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api.del(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
  })
}

export function useResetPassword(groupId: number) {
  return useMutation({
    mutationFn: (userId: number) =>
      api.post<{ temporaryPassword: string }>(`/groups/${groupId}/members/${userId}/reset-password`),
  })
}
