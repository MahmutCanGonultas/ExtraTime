import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useSyncBudget, useSyncStatus, useTriggerSync } from '@/features/admin/hooks'
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
      <div className="relative overflow-hidden rounded-2xl border border-ink-800 bg-gradient-to-r from-ink-900 via-ink-900 to-ink-950 p-5">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(120% 140% at 100% 0%, rgba(56,189,248,0.10), transparent 55%)' }}
        />
        <div className="relative flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg ring-1 ring-white/15">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink-50">Yönetim Paneli</h1>
            <p className="text-sm text-ink-400">Kullanıcıları, grupları ve veri senkronizasyonunu yönet.</p>
          </div>
        </div>
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

// The jobs worth triggering by hand. The five ticks are exactly what the cron
// runs — same code path — and each adapts to the live plan on its own, so this
// list does not change when the subscription lapses or comes back.
const SYNC_JOBS = [
  { key: 'tick/hourly', label: 'Skorlar + Puan Durumu', cost: 'saatlik iş' },
  { key: 'tick/detail', label: 'Maç Detayları', cost: 'maç başına' },
  { key: 'tick/schedule', label: 'Fikstür', cost: 'günlük iş' },
  { key: 'tick/daily-lists', label: 'Krallıklar + Kadrolar', cost: 'günlük iş' },
  { key: 'tick/backlog', label: 'Eksik Maçlar', cost: 'maç başına' },
  { key: 'settle', label: 'Puanlama', cost: 'bedava' },
  { key: 'plan', label: 'Plan Kontrolü', cost: '1 istek' },
  { key: 'goals-from-events', label: 'Golleri Türet', cost: 'bedava' },
  { key: 'stale-live', label: 'Takılı Maçlar', cost: 'genelde bedava' },
]

function SyncPanel() {
  const status = useSyncStatus()
  const budget = useSyncBudget()
  const trigger = useTriggerSync()

  const b = budget.data
  // Amber once the bounded jobs are about to stop themselves (they hold a
  // 30-request floor back for the scores), red when even that is nearly gone.
  const tone = !b ? 'neutral' : b.remaining <= 15 ? 'loss' : b.remaining <= 35 ? 'warning' : 'win'
  const barColor = tone === 'loss' ? 'bg-loss' : tone === 'warning' ? 'bg-amber-400' : 'bg-win'

  return (
    <Card>
      <CardHeader title="Senkronizasyon Sağlığı" />
      <CardBody className="space-y-4">
        {b && (
          <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-300">Bugünkü API kotası</span>
              <span className="text-sm tabular-nums text-ink-100">
                <Badge tone={tone}>
                  {b.used} / {b.limit}
                </Badge>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(100, (b.used / b.limit) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              <span className="text-ink-300">{b.plan?.plan ?? '?'}</span> planı · {b.remaining} istek
              kaldı · sayaç ~00:00 UTC&apos;de sıfırlanır.
              {b.plan?.restricted
                ? ' Bu plan güncel sezonu lig+sezon filtresiyle vermiyor, bu yüzden puan durumu ve krallıklar kayıtlı maç sonuçlarından hesaplanıyor (bedava).'
                : ' Puan durumu ve krallıklar API’den çekiliyor — puan silme cezaları dahil.'}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {SYNC_JOBS.map((j) => (
            <Button
              key={j.key}
              size="sm"
              variant="secondary"
              title={`Maliyet: ${j.cost}`}
              onClick={() => trigger.mutate(j.key)}
              disabled={trigger.isPending}
            >
              {j.label}
              <span className="ml-1.5 text-[10px] text-ink-500">{j.cost}</span>
            </Button>
          ))}
        </div>
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
