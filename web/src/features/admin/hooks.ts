import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GameFixture, LeaderboardEntry, Outcome, SeasonRef } from '@/features/groups/types'

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-group', groupId] })
      qc.invalidateQueries({ queryKey: ['audit-log', groupId] })
    },
  })
}

export function useAdminRemoveMember(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api.del(`/admin/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-group', groupId] })
      // Keep the summary lists' member counts in sync.
      qc.invalidateQueries({ queryKey: ['admin-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-all-groups'] })
    },
  })
}

export function useAdminResetMemberPassword(groupId: number) {
  return useMutation({
    mutationFn: (userId: number) =>
      api.post<{ temporaryPassword: string }>(`/admin/groups/${groupId}/members/${userId}/reset-password`),
  })
}

export interface AdminMemberPrediction {
  userId: number
  displayName: string
  predictedOutcome: Outcome | null
  predictedHome: number | null
  predictedAway: number | null
  pointsAwarded: number | null
}

export function useAdminFixturePredictions(groupId: number, fixtureId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-fixture-predictions', groupId, fixtureId],
    queryFn: () =>
      api.get<{ predictions: AdminMemberPrediction[] }>(
        `/admin/groups/${groupId}/fixtures/${fixtureId}/predictions`,
      ),
    select: (d) => d.predictions,
    enabled: enabled && groupId > 0 && fixtureId > 0,
  })
}

export function useAdminSetPrediction(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      userId: number
      fixtureId: number
      outcome: Outcome
      predictedHome?: number | null
      predictedAway?: number | null
    }) => api.post(`/admin/groups/${groupId}/predictions`, input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-fixture-predictions', groupId, v.fixtureId] })
      qc.invalidateQueries({ queryKey: ['admin-group', groupId] })
    },
  })
}

// Correct a match's score by hand and re-settle every prediction on it.
export function useAdminSetFixtureResult(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { fixtureId: number; homeScore: number; awayScore: number }) =>
      api.post<{ settled: number }>(`/admin/fixtures/${input.fixtureId}/result`, input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-fixture-predictions', groupId, v.fixtureId] })
      qc.invalidateQueries({ queryKey: ['admin-group', groupId] })
    },
  })
}

// ---- Platform overview ----

export interface AdminStats {
  users: number
  admins: number
  newUsers7d: number
  groups: number
  games: number
  activeGames: number
  predictions: number
  fixtures: number
  players: number
  leagues: number
  apiRequestsToday: number
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  })
}

// ---- User management ----

export interface AdminUser {
  id: number
  email: string
  displayName: string
  isAdmin: boolean
  isEnvAdmin: boolean
  createdAt: string
  groupCount: number
  ownedGroups: number
  predictionCount: number
}
export interface AdminUserGroup {
  id: number
  name: string
  isOwner: boolean
  memberCount: number
}
export interface AdminUserDetail extends AdminUser {
  groups: AdminUserGroup[]
}

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api.get<{ users: AdminUser[] }>(`/admin/users?search=${encodeURIComponent(search)}`),
    select: (d) => d.users,
  })
}

export function useAdminUserDetail(userId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${userId}`),
    enabled: enabled && userId > 0,
  })
}

export function useAdminResetUserPassword() {
  return useMutation({
    mutationFn: (userId: number) =>
      api.post<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`),
  })
}

export function useAdminUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: number; displayName?: string; email?: string }) =>
      api.patch(`/admin/users/${input.userId}`, {
        displayName: input.displayName,
        email: input.email,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useAdminSetUserAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: number; isAdmin: boolean }) =>
      api.post(`/admin/users/${input.userId}/admin`, { isAdmin: input.isAdmin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useAdminDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api.del(`/admin/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

// ---- Group management ----

export interface AdminGroup {
  id: number
  name: string
  inviteCode: string
  ownerId: number
  ownerName: string | null
  createdAt: string
  memberCount: number
  gameCount: number
}

export function useAdminAllGroups() {
  return useQuery({
    queryKey: ['admin-all-groups'],
    queryFn: () => api.get<{ groups: AdminGroup[] }>('/admin/all-groups'),
    select: (d) => d.groups,
  })
}

function useGroupsInvalidator() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin-all-groups'] })
    qc.invalidateQueries({ queryKey: ['admin-groups'] })
  }
}

export function useAdminRenameGroup() {
  const invalidate = useGroupsInvalidator()
  return useMutation({
    mutationFn: (input: { groupId: number; name: string }) =>
      api.patch(`/admin/groups/${input.groupId}`, { name: input.name }),
    onSuccess: invalidate,
  })
}

export function useAdminDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: number) => api.del(`/admin/groups/${groupId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useAdminTransferGroup() {
  const invalidate = useGroupsInvalidator()
  return useMutation({
    mutationFn: (input: { groupId: number; email: string }) =>
      api.post(`/admin/groups/${input.groupId}/transfer`, { email: input.email }),
    onSuccess: invalidate,
  })
}

export function useAdminRegenerateInvite() {
  const invalidate = useGroupsInvalidator()
  return useMutation({
    mutationFn: (groupId: number) =>
      api.post<{ inviteCode: string }>(`/admin/groups/${groupId}/regenerate-invite`),
    onSuccess: invalidate,
  })
}

export function useAdminAddMember() {
  const invalidate = useGroupsInvalidator()
  return useMutation({
    mutationFn: (input: { groupId: number; email: string }) =>
      api.post(`/admin/groups/${input.groupId}/add-member`, { email: input.email }),
    onSuccess: invalidate,
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
