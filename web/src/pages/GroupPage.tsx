import { useState, type FormEvent } from 'react'
import { Copy, RefreshCw, Users, Crown, X } from 'lucide-react'
import { MemberAvatar } from '@/components/MemberAvatar'
import { cn } from '@/lib/cn'
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
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Clean intro — no heavy banner. */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">
          <Users className="h-3.5 w-3.5" /> Grup
        </div>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-ink-100">Arkadaşlarınla oyna</h1>
        <p className="mt-2 max-w-md text-sm text-ink-400">
          Bir grup kur, davet kodunu paylaş; maç sonuçlarını tahmin edip haftanın şampiyonunu
          belirleyin.
        </p>
      </div>

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

  const members = g?.members ?? []
  const memberCount = members.length || group.memberCount

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Clean header — no heavy banner. */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">
          <Users className="h-3.5 w-3.5" /> Grup
        </div>
        <h1 className="mt-1.5 break-words text-3xl font-bold tracking-tight text-ink-100">
          {g?.name ?? group.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-400">{memberCount} oyuncu</span>
          {members.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2.5">
                {members.slice(0, 8).map((m) => (
                  <MemberAvatar
                    key={m.id}
                    name={m.displayName}
                    avatar={m.avatar}
                    size={30}
                    className="ring-2 ring-ink-900"
                  />
                ))}
              </div>
              {members.length > 8 && (
                <span className="ml-2 text-xs font-medium text-ink-400">+{members.length - 8}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite code — a plain card. */}
      {g?.isAdmin && g.inviteCode && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Davet kodu
              </div>
              <div className="font-mono text-2xl font-black tracking-[0.26em] text-ink-100">
                {g.inviteCode}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={copyInvite}>
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

      <GameManager groupId={group.id} isAdmin={g?.isAdmin ?? false} currentUserId={user?.id} />

      {/* Members */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
          Üyeler · {memberCount}
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              groupId={group.id}
              isAdminOfMember={m.id === g?.adminUserId}
              isMe={m.id === user?.id}
              canManage={(g?.isAdmin ?? false) && m.id !== g?.adminUserId}
            />
          ))}
        </div>
      </section>

      <RivalryBook groupId={group.id} />

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

function MemberCard({
  member,
  groupId,
  isAdminOfMember,
  isMe,
  canManage,
}: {
  member: GroupMember
  groupId: number
  isAdminOfMember: boolean
  isMe: boolean
  canManage: boolean
}) {
  const remove = useRemoveMember(groupId)

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-xl border p-3 pt-4 text-center transition',
        isAdminOfMember
          ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/[0.10] to-ink-900'
          : isMe
            ? 'border-brand-500/35 bg-gradient-to-b from-brand-500/[0.10] to-ink-900'
            : 'border-ink-800 bg-ink-900/50',
      )}
    >
      <MemberAvatar
        name={member.displayName}
        avatar={member.avatar}
        size={52}
        className={cn(
          isAdminOfMember ? 'ring-2 ring-amber-400/60' : isMe ? 'ring-2 ring-brand-400/60' : '',
        )}
      />
      <div className="min-w-0 w-full">
        <div className="truncate text-sm font-semibold text-ink-100">
          {member.displayName}
          {isMe && <span className="ml-1 text-xs font-normal text-brand-300">(sen)</span>}
        </div>
        {isAdminOfMember ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
            <Crown className="h-2.5 w-2.5" /> Başkan
          </span>
        ) : (
          <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-ink-500">Üye</span>
        )}
      </div>
      {canManage && (
        <button
          onClick={() => remove.mutate(member.id)}
          disabled={remove.isPending}
          title="Gruptan çıkar"
          aria-label={`${member.displayName} — gruptan çıkar`}
          className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full border border-ink-700 bg-ink-950 text-ink-400 opacity-100 shadow transition hover:border-loss/50 hover:text-loss sm:opacity-0 sm:group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
