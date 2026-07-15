import { useState, type FormEvent } from 'react'
import { Copy, RefreshCw, Users } from 'lucide-react'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import {
  useCreateGroup,
  useGroup,
  useJoinGroup,
  useLeaderboard,
  useRegenerateInvite,
} from '@/features/groups/hooks'
import type { GroupSummary } from '@/features/groups/types'
import { Leaderboard } from '@/features/groups/Leaderboard'
import { useAuth } from '@/features/auth/AuthContext'
import { ApiError } from '@/lib/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'
import { Skeleton, EmptyState, ErrorState } from '@/components/ui/feedback'

export function GroupPage() {
  const { active, isLoading } = useActiveGroup()

  if (isLoading) return <Skeleton className="h-64" />
  if (!active) return <NoGroup />
  return <GroupView group={active} />
}

function NoGroup() {
  const create = useCreateGroup()
  const join = useJoinGroup()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await create.mutateAsync(name)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Grup oluşturulamadı')
    }
  }
  async function onJoin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await join.mutateAsync(code.trim().toUpperCase())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gruba katılınamadı')
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink-100">Grup</h1>
      <p className="mb-4 text-sm text-ink-400">Bir grup kur ya da davet koduyla katıl.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Grup kur" />
          <CardBody>
            <form onSubmit={onCreate} className="space-y-3">
              <Field label="Grup adı">
                <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </Field>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? 'Oluşturuluyor...' : 'Grup kur'}
              </Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Gruba katıl" />
          <CardBody>
            <form onSubmit={onJoin} className="space-y-3">
              <Field label="Davet kodu">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="ör. K7M2PQ9X"
                  className="uppercase"
                />
              </Field>
              <Button type="submit" variant="secondary" className="w-full" disabled={join.isPending}>
                {join.isPending ? 'Katılınıyor...' : 'Katıl'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
      {error && <p className="mt-3 text-sm text-loss">{error}</p>}
    </div>
  )
}

function GroupView({ group }: { group: GroupSummary }) {
  const { user } = useAuth()
  const detail = useGroup(group.id)
  const leaderboard = useLeaderboard(group.id)
  const regenerate = useRegenerateInvite(group.id)
  const [copied, setCopied] = useState(false)

  const g = detail.data

  function copyInvite() {
    if (!g?.inviteCode) return
    navigator.clipboard.writeText(g.inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-100">{g?.name ?? group.name}</h1>
        <span className="flex items-center gap-1 text-sm text-ink-400">
          <Users className="h-4 w-4" /> {g?.members.length ?? group.memberCount}
        </span>
      </div>

      {g?.isAdmin && g.inviteCode && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-500">Davet kodu</div>
              <div className="font-mono text-lg font-bold tracking-widest text-brand-300">
                {g.inviteCode}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" onClick={copyInvite}>
                <Copy className="h-4 w-4" /> {copied ? 'Kopyalandı' : 'Kopyala'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => regenerate.mutate()}
                disabled={regenerate.isPending}
              >
                <RefreshCw className="h-4 w-4" /> Yenile
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Lider Tablosu" />
        {leaderboard.isLoading ? (
          <Skeleton className="m-4 h-40" />
        ) : leaderboard.isError ? (
          <ErrorState onRetry={() => leaderboard.refetch()} />
        ) : leaderboard.data?.length ? (
          <Leaderboard entries={leaderboard.data} currentUserId={user?.id} />
        ) : (
          <EmptyState title="Henüz puan yok" description="Maçlar sonuçlandıkça tablo dolacak." />
        )}
      </Card>

      <Card>
        <CardHeader title="Üyeler" />
        <CardBody>
          <ul className="divide-y divide-ink-850">
            {g?.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-100">{m.displayName}</span>
                {m.id === g.adminUserId && <span className="text-xs text-brand-300">admin</span>}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
