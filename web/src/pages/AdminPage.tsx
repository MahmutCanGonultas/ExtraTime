import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useSyncStatus, useTriggerSync } from '@/features/admin/hooks'
import { useGroup, useMyGroups, useRemoveMember, useResetPassword } from '@/features/groups/hooks'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'

export function AdminPage() {
  const { isPlatformAdmin } = useAuth()
  const groups = useMyGroups()
  const adminGroups = (groups.data ?? []).filter((g) => g.isAdmin)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink-100">Admin</h1>

      {isPlatformAdmin && <SyncPanel />}
      {adminGroups.map((g) => (
        <GroupAdminPanel key={g.id} groupId={g.id} />
      ))}

      {!isPlatformAdmin && adminGroups.length === 0 && (
        <EmptyState
          title="Yönetim yetkin yok"
          description="Bir grubun admini değilsin ve platform yöneticisi de değilsin."
        />
      )}
    </div>
  )
}

const SYNC_JOBS = [
  { key: 'fixtures', label: 'Fikstür' },
  { key: 'results', label: 'Sonuçlar' },
  { key: 'standings', label: 'Puan Durumu' },
  { key: 'topscorers', label: 'Gol Krallığı' },
  { key: 'topassists', label: 'Asist Krallığı' },
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

function GroupAdminPanel({ groupId }: { groupId: number }) {
  const detail = useGroup(groupId)
  const remove = useRemoveMember(groupId)
  const reset = useResetPassword(groupId)
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null)

  const g = detail.data

  async function onReset(userId: number, name: string) {
    const res = await reset.mutateAsync(userId)
    setTempPassword({ name, password: res.temporaryPassword })
  }

  return (
    <Card>
      <CardHeader title={`${g?.name ?? 'Grup'} — Üye Yönetimi`} />
      <CardBody className="space-y-3">
        {detail.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <ul className="divide-y divide-ink-850">
            {g?.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-ink-100">
                  {m.displayName}
                  {m.id === g.adminUserId && <span className="ml-1 text-xs text-brand-300">admin</span>}
                </span>
                {m.id !== g.adminUserId && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onReset(m.id, m.displayName)}>
                      Şifre sıfırla
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove.mutate(m.id)}
                      disabled={remove.isPending}
                    >
                      Çıkar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {tempPassword && (
          <div className="rounded-lg border border-ink-700 bg-ink-800 p-3 text-sm">
            <span className="text-ink-300">{tempPassword.name} için geçici şifre: </span>
            <span className="font-mono font-bold text-brand-300">{tempPassword.password}</span>
            <span className="ml-2 text-xs text-ink-500">(bir kez gösterilir — kopyala)</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
