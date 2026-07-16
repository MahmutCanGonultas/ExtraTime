import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GameFixture, LeaderboardEntry, SeasonRef } from '@/features/groups/types'

export interface SyncJobStatus {
  job_name: string
  ran_at: string
  records_upserted: number
  api_requests_used: number
  success: boolean
  error_message: string | null
}

// ---- Platform-admin group moderation ----

export interface AdminGroupSummary {
  id: number
  name: string
  adminUserId: number
  memberCount: number
  activeSeasonTitle: string | null
}

export interface AdminGroupOverview {
  group: { id: number; name: string; adminUserId: number; activeSeason: SeasonRef | null }
  standings: LeaderboardEntry[]
  fixtures: GameFixture[]
}

export function useAdminGroups() {
  return useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => api.get<{ groups: AdminGroupSummary[] }>('/admin/groups'),
    select: (d) => d.groups,
  })
}

export function useAdminGroupOverview(groupId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-group', groupId],
    queryFn: () => api.get<AdminGroupOverview>(`/admin/groups/${groupId}`),
    enabled: enabled && groupId > 0,
  })
}

export function useAdminCandidateFixtures(groupId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-candidate-fixtures', groupId],
    queryFn: () => api.get<{ fixtures: GameFixture[] }>(`/admin/groups/${groupId}/candidate-fixtures`),
    select: (d) => d.fixtures,
    enabled: enabled && groupId > 0,
  })
}

export function useAdminAddFixture(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: number) => api.post(`/admin/groups/${groupId}/fixtures`, { fixtureId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-group', groupId] })
      qc.invalidateQueries({ queryKey: ['admin-candidate-fixtures', groupId] })
    },
  })
}

export function useAdminRemoveFixture(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: number) => api.del(`/admin/groups/${groupId}/fixtures/${fixtureId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-group', groupId] })
      qc.invalidateQueries({ queryKey: ['admin-candidate-fixtures', groupId] })
    },
  })
}

export function useAdminAdjustPoints(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: number; delta: number; reason?: string }) =>
      api.post(`/admin/groups/${groupId}/adjustments`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-group', groupId] }),
  })
}

export function useAdminRemoveMember(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api.del(`/admin/groups/${groupId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-group', groupId] }),
  })
}

export function useAdminResetMemberPassword(groupId: number) {
  return useMutation({
    mutationFn: (userId: number) =>
      api.post<{ temporaryPassword: string }>(`/admin/groups/${groupId}/members/${userId}/reset-password`),
  })
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: () => api.get<{ jobs: SyncJobStatus[] }>('/admin/sync/status'),
    select: (d) => d.jobs,
  })
}

// Triggers a sync job (fixtures | results | standings | topscorers | topassists).
export function useTriggerSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (job: string) => api.post(`/admin/sync/${job}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sync-status'] }),
  })
}
