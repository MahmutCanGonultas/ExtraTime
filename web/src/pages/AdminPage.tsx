import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useSyncStatus, useTriggerSync } from '@/features/admin/hooks'
import { AdminOverview } from '@/features/admin/AdminOverview'
import { AdminUsers } from '@/features/admin/AdminUsers'
import { AdminGroups } from '@/features/admin/AdminGroups'
import { GroupModeration } from '@/features/admin/GroupModeration'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'

const TABS = [
  { key: 'overview', label: 'Genel Bakış' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'groups', label: 'Gruplar' },
  { key: 'moderation', label: 'Grup Denetimi' },
  { key: 'sync', label: 'Senkronizasyon' },
]

export function AdminPage() {
  const { isPlatformAdmin } = useAuth()
  const [tab, setTab] = useState('overview')

  if (!isPlatformAdmin) {
    return (
      <EmptyState
        title="Yönetim yetkin yok"
        description="Bu alan platform yöneticisine özeldir. Kendi grubunu Grup sayfasından yönetebilirsin."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Yönetim Paneli</h1>
        <p className="mt-1 text-sm text-ink-400">Kullanıcıları, grupları ve veri senkronizasyonunu yönet.</p>
      </div>

      <Tabs items={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && <AdminOverview />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'groups' && <AdminGroups />}
      {tab === 'moderation' && <GroupModeration />}
      {tab === 'sync' && <SyncPanel />}
    </div>
  )
}

const SYNC_JOBS = [
  { key: 'fixtures', label: 'Fikstür' },
  { key: 'results', label: 'Sonuçlar' },
  { key: 'standings', label: 'Puan Durumu' },
  { key: 'topscorers', label: 'Gol Krallığı' },
  { key: 'topassists', label: 'Asist Krallığı' },
  { key: 'squads', label: 'Kadrolar' },
  { key: 'live', label: 'Canlı Skorlar' },
]

function SyncPanel() {
  const status = useSyncStatus()
  const trigger = useTriggerSync()

  return (
    <Card>
      <CardHeader title="Senkronizasyon Sağlığı" />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SYNC_JOBS.map((j) => (
            <Button
              key={j.key}
              size="sm"
              variant="secondary"
              onClick={() => trigger.mutate(j.key)}
              disabled={trigger.isPending}
            >
              {j.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-ink-500">
          Her senkronizasyon API-Football kotasından harcar; canlı maç günlerinde dikkatli tetikle.
        </p>
        {trigger.isError && (
          <p className="text-sm text-loss">
            Senkronizasyon başarısız:{' '}
            {trigger.error instanceof ApiError ? trigger.error.message : 'bilinmeyen hata'}
          </p>
        )}
        {trigger.isSuccess && <p className="text-sm text-brand-300">Senkronizasyon tetiklendi.</p>}

        {status.isLoading ? (
          <Skeleton className="h-32" />
        ) : !status.data?.length ? (
          <EmptyState title="Henüz sync kaydı yok" description="Bir sync tetikleyince burada görünür." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>İş</Th>
                <Th>Zaman</Th>
                <Th className="text-center">Kayıt</Th>
                <Th className="text-center">İstek</Th>
                <Th className="text-center">Durum</Th>
              </tr>
            </thead>
            <tbody>
              {status.data.map((s) => (
                <Tr key={s.job_name}>
                  <Td className="text-ink-100">{s.job_name}</Td>
                  <Td className="text-ink-400">{formatDateTime(s.ran_at)}</Td>
                  <Td className="text-center">{s.records_upserted}</Td>
                  <Td className="text-center">{s.api_requests_used}</Td>
                  <Td className="text-center">
                    {s.success ? <Badge tone="win">OK</Badge> : <Badge tone="loss">Hata</Badge>}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  )
}
