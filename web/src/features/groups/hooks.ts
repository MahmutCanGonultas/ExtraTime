import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  FixturePredictions,
  GroupDetail,
  GroupSummary,
  LeaderboardEntry,
  MyPrediction,
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
    mutationFn: (input: { fixtureId: number; predictedHome: number; predictedAway: number }) =>
      api.put(`/groups/${groupId}/predictions/${input.fixtureId}`, {
        predictedHome: input.predictedHome,
        predictedAway: input.predictedAway,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-predictions', groupId] })
      qc.invalidateQueries({ queryKey: ['leaderboard', groupId] })
    },
  })
}

export function useRegenerateInvite(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ inviteCode: string }>(`/groups/${groupId}/regenerate-invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
  })
}
