import { useState, type FormEvent } from 'react'
import { Copy, RefreshCw, Users } from 'lucide-react'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import {
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useJoinGroup,
  useRegenerateInvite,
  useRemoveMember,
} from '@/features/groups/hooks'
import type { GroupMember } from '@/features/groups/types'
import type { GroupSummary } from '@/features/groups/types'
import { RivalryBook } from '@/features/groups/RivalryBook'
import { GameManager } from '@/features/groups/GameManager'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { BallMark } from '@/components/Brand'
import { useAuth } from '@/features/auth/AuthContext'
import { ApiError } from '@/lib/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/feedback'

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
    <div className="space-y-5">
      {/* Hero — a welcoming pitch banner instead of a bare heading. */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <BallMark size={190} className="pointer-events-none absolute -bottom-12 -left-8 text-brand-400/[0.04]" />
        <div className="relative px-6 py-8 sm:px-8">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">
            <Users className="h-3.5 w-3.5" /> Grup
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-100">
            Arkadaşlarınla oyna
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink-300">
            Bir grup kur, davet kodunu paylaş; maç sonuçlarını tahmin edip haftanın şampiyonunu
            belirleyin.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Grup kur" />
          <CardBody>
            <p className="mb-3 text-xs text-ink-400">Yeni bir grup aç ve başkanı ol.</p>
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
            <p className="mb-3 text-xs text-ink-400">Arkadaşının paylaştığı davet koduyla gir.</p>
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
      {error && <p className="text-sm text-loss">{error}</p>}
    </div>
  )
}

function GroupView({ group }: { group: GroupSummary }) {
  const { user } = useAuth()
  const detail = useGroup(group.id)
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

  const memberCount = g?.members.length ?? group.memberCount

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <BallMark size={190} className="pointer-events-none absolute -bottom-12 -left-8 text-brand-400/[0.04]" />
        <div className="relative px-6 py-7 sm:px-8">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">
            <Users className="h-3.5 w-3.5" /> Grup
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-100">
            {g?.name ?? group.name}
          </h1>
          <p className="mt-1 text-sm text-ink-300">{memberCount} oyuncu</p>
        </div>
      </section>

      <GameManager groupId={group.id} isAdmin={g?.isAdmin ?? false} currentUserId={user?.id} />

      <RivalryBook groupId={group.id} />

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
        <CardHeader title="Üyeler" />
        <CardBody>
          <ul className="divide-y divide-ink-850">
            {g?.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                groupId={group.id}
                isAdminOfMember={m.id === g.adminUserId}
                canManage={(g?.isAdmin ?? false) && m.id !== g?.adminUserId}
              />
            ))}
          </ul>
        </CardBody>
      </Card>

      {g?.isAdmin && <DeleteGroup groupId={group.id} name={g?.name ?? group.name} />}
    </div>
  )
}

function DeleteGroup({ groupId, name }: { groupId: number; name: string }) {
  const del = useDeleteGroup()
  const [confirming, setConfirming] = useState(false)

  return (
    <Card className="border-loss/20">
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink-100">Grubu sil</div>
          <div className="text-xs text-ink-400">
            Grup, tüm oyunları, tahminleri ve geçmişi kalıcı olarak silinir.
          </div>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-loss">“{name}” silinsin mi?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Vazgeç
            </Button>
            <Button size="sm" variant="danger" disabled={del.isPending} onClick={() => del.mutate(groupId)}>
              Evet, sil
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirming(true)}>
            Grubu Sil
          </Button>
        )}
      </CardBody>
    </Card>
  )
}

function MemberRow({
  member,
  groupId,
  isAdminOfMember,
  canManage,
}: {
  member: GroupMember
  groupId: number
  isAdminOfMember: boolean
  canManage: boolean
}) {
  const remove = useRemoveMember(groupId)

  return (
    <li className="py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-ink-100">
          {member.displayName}
          {isAdminOfMember && <span className="ml-1 text-xs text-brand-300">başkan</span>}
        </span>
        {canManage && (
          <Button
            size="sm"
            variant="ghost"
            className="text-loss"
            onClick={() => remove.mutate(member.id)}
            disabled={remove.isPending}
          >
            Çıkar
          </Button>
        )}
      </div>
    </li>
  )
}
