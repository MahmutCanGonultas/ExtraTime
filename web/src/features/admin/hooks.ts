import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SyncJobStatus {
  job_name: string
  ran_at: string
  records_upserted: number
  api_requests_used: number
  success: boolean
  error_message: string | null
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
