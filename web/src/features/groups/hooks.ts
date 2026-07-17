import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { setActiveGroupId } from './activeGroupStore'
import type {
  Champion,
  FixturePredictions,
  GameFixture,
  GroupDetail,
  GroupSummary,
  LeaderboardEntry,
  MyPrediction,
  Outcome,
  ProvisionalEntry,
  Rivalry,
  SeasonDetail,
  SeasonRef,
  SeasonSummary,
  SettledPoint,
  Trophies,
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

export function useUpsertPrediction(groupId: number, gameId: number) {
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
      qc.invalidateQueries({ queryKey: ['game', groupId, gameId] })
      qc.invalidateQueries({ queryKey: ['leaderboard', groupId] })
    },
  })
}

// ---- Games: a group can run several at once, each with its own matches ----

export function useGames(groupId: number) {
  return useQuery({
    queryKey: ['games', groupId],
    queryFn: () => api.get<{ games: SeasonSummary[] }>(`/groups/${groupId}/games`),
    select: (d) => d.games,
    enabled: groupId > 0,
  })
}

export function useGameDetail(groupId: number, gameId: number | null) {
  return useQuery({
    queryKey: ['game', groupId, gameId],
    queryFn: () => api.get<SeasonDetail>(`/groups/${groupId}/games/${gameId}`),
    enabled: groupId > 0 && gameId != null && gameId > 0,
  })
}

export function useCreateGame(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) =>
      api.post<{ game: SeasonRef }>(`/groups/${groupId}/games`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games', groupId] }),
  })
}

export function useGameCandidates(groupId: number, gameId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['candidate-fixtures', groupId, gameId],
    queryFn: () =>
      api.get<{ fixtures: GameFixture[] }>(`/groups/${groupId}/games/${gameId}/candidate-fixtures`),
    select: (d) => d.fixtures,
    enabled: enabled && groupId > 0 && gameId > 0,
  })
}

export function useAddGameFixture(groupId: number, gameId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: number) =>
      api.post(`/groups/${groupId}/games/${gameId}/fixtures`, { fixtureId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game', groupId, gameId] })
      qc.invalidateQueries({ queryKey: ['candidate-fixtures', groupId, gameId] })
    },
  })
}

export function useRemoveGameFixture(groupId: number, gameId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: number) =>
      api.del(`/groups/${groupId}/games/${gameId}/fixtures/${fixtureId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game', groupId, gameId] })
      qc.invalidateQueries({ queryKey: ['candidate-fixtures', groupId, gameId] })
    },
  })
}

export function useFinishGame(groupId: number, gameId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ champion: Champion | null }>(`/groups/${groupId}/games/${gameId}/finish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['games', groupId] })
      qc.invalidateQueries({ queryKey: ['game', groupId, gameId] })
    },
  })
}

export function useRivalries(groupId: number) {
  return useQuery({
    queryKey: ['rivalries', groupId],
    queryFn: () => api.get<{ rivalries: Rivalry[] }>(`/groups/${groupId}/rivalries`),
    select: (d) => d.rivalries,
    enabled: groupId > 0,
  })
}

export function useTrophies(groupId: number, userId: number) {
  return useQuery({
    queryKey: ['trophies', groupId, userId],
    queryFn: () => api.get<Trophies>(`/groups/${groupId}/members/${userId}/trophies`),
    enabled: groupId > 0 && userId > 0,
  })
}

export function useProvisionalLeaderboard(groupId: number, gameId: number) {
  return useQuery({
    queryKey: ['leaderboard-live', groupId, gameId],
    queryFn: () =>
      api.get<{ entries: ProvisionalEntry[]; live: boolean }>(
        `/groups/${groupId}/games/${gameId}/leaderboard/live`,
      ),
    enabled: groupId > 0 && gameId > 0,
    refetchInterval: 20_000,
  })
}

export function useRegenerateInvite(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ inviteCode: string }>(`/groups/${groupId}/regenerate-invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: number) => api.del(`/groups/${groupId}`),
    onSuccess: () => {
      setActiveGroupId(0)
      qc.invalidateQueries({ queryKey: ['my-groups'] })
    },
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
