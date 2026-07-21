import { useState, type FormEvent } from 'react'
import { Copy, RefreshCw, Users, Crown, X, Plus } from 'lucide-react'
import { MemberAvatar } from '@/components/MemberAvatar'
import { cn } from '@/lib/cn'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import {
  useAuditLog,
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useJoinGroup,
  useLeaveGroup,
  useRegenerateInvite,
  useRemoveMember,
} from '@/features/groups/hooks'
import type { GroupMember } from '@/features/groups/types'
import type { GroupSummary } from '@/features/groups/types'
import { formatDateTime } from '@/lib/format'
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
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">
          <Users className="h-3.5 w-3.5" /> Grup
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink-100 sm:text-5xl">
          Arkadaşlarınla oyna
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-400">
          Bir grup kur, davet kodunu paylaş; maç sonuçlarını tahmin edip haftanın şampiyonunu
          belirleyin.
        </p>
      </div>
      <GroupForms />
    </div>
  )
}

// The create + join forms, reused by the no-group screen AND (collapsed) from inside
// a group so a member can always join or start another group.
function GroupForms() {
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
    <div className="space-y-4">
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

// Collapsed entry point, shown inside an existing group, to join/create another one.
function AnotherGroupPanel() {
  const [open, setOpen] = useState(false)
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-brand-300 transition hover:text-brand-200"
      >
        <Plus className={cn('h-4 w-4 transition', open && 'rotate-45')} />
        {open ? 'Kapat' : 'Başka gruba katıl veya yeni grup kur'}
      </button>
      {open && (
        <div className="mt-4">
          <GroupForms />
        </div>
      )}
    </section>
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
    const code = g.inviteCode
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    // Clipboard API is unavailable in insecure contexts / when permission is
    // denied — fall back to a prompt the admin can copy from manually.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(done)
        .catch(() => window.prompt('Davet kodunu kopyala:', code))
    } else {
      window.prompt('Davet kodunu kopyala:', code)
    }
  }

  const members = g?.members ?? []
  const memberCount = members.length || group.memberCount

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header — clean, on the normal canvas (no dark block), strong type. */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">
          <Users className="h-3.5 w-3.5" /> Grup
        </div>
        <h1 className="mt-2 break-words font-display text-4xl font-extrabold tracking-tight text-ink-100 sm:text-5xl">
          {g?.name ?? group.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2.5">
                {members.slice(0, 8).map((m) => (
                  <MemberAvatar
                    key={m.id}
                    name={m.displayName}
                    avatar={m.avatar}
                    size={32}
                    className="ring-2 ring-ink-950"
                  />
                ))}
              </div>
              {members.length > 8 && (
                <span className="ml-2 text-xs font-semibold text-ink-400">+{members.length - 8}</span>
              )}
            </div>
          )}
          <span className="rounded-full bg-ink-850 px-3 py-1 text-xs font-bold text-ink-200 ring-1 ring-ink-800">
            {memberCount} oyuncu
          </span>
        </div>
      </div>

      {/* Invite code — a warm, unmistakable "share this" card. */}
      {g?.isAdmin && g.inviteCode && (
        <Card className="border-amber-500/30 bg-amber-500/[0.05]">
          <CardBody className="flex flex-wrap items-center gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <Copy className="h-3.5 w-3.5" /> Davet kodu
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
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink-100">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
          Üyeler
          <span className="text-sm font-medium text-ink-500">· {memberCount}</span>
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

      <AuditLog groupId={group.id} />

      <RivalryBook groupId={group.id} />

      <AnotherGroupPanel />

      {g?.isAdmin ? (
        <DeleteGroup groupId={group.id} name={g?.name ?? group.name} />
      ) : (
        <LeaveGroup groupId={group.id} name={g?.name ?? group.name} />
      )}
    </div>
  )
}

// Colour-coded dot per action type so the log scans at a glance.
const ACTION_DOT: Record<string, string> = {
  point_adjust: 'bg-amber-400',
  fixture_add: 'bg-emerald-400',
  fixture_remove: 'bg-loss',
  game_create: 'bg-sky-400',
  game_finish: 'bg-violet-400',
}

// Admin-action history — WHAT changed (points, games, matches) and WHICH admin did
// it. Visible to every member for transparency; hidden until there's something.
function AuditLog({ groupId }: { groupId: number }) {
  const { data } = useAuditLog(groupId)
  if (!data || data.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink-100">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-sky-400 to-sky-600" />
        İşlem Geçmişi
        <span className="text-sm font-medium text-ink-500">· yönetici hareketleri</span>
      </h2>
      <Card className="overflow-hidden">
        <ul className="max-h-96 divide-y divide-ink-850 overflow-y-auto">
          {data.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', ACTION_DOT[e.action] ?? 'bg-ink-500')}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink-100">{e.summary}</div>
                <div className="mt-0.5 text-[11px] text-ink-500">
                  <span className="font-semibold text-ink-400">{e.actorName}</span> ·{' '}
                  {formatDateTime(e.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
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

function LeaveGroup({ groupId, name }: { groupId: number; name: string }) {
  const leave = useLeaveGroup(groupId)
  const [confirming, setConfirming] = useState(false)

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink-100">Gruptan ayrıl</div>
          <div className="text-xs text-ink-400">
            Bu gruptan çıkarsın; bu gruptaki tahminlerin silinir.
          </div>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-300">“{name}” grubundan ayrıl?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Vazgeç
            </Button>
            <Button size="sm" variant="danger" disabled={leave.isPending} onClick={() => leave.mutate()}>
              Evet, ayrıl
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
            Gruptan ayrıl
          </Button>
        )}
      </CardBody>
    </Card>
  )
}

// A varied palette so the members grid reads as a colourful roster, not a grey wall.
const MEMBER_COLORS = ['#60a5fa', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185', '#4ade80', '#38bdf8', '#f59e0b']
function memberAccent(id: number, isAdminOfMember: boolean, isMe: boolean): string {
  if (isAdminOfMember) return '#fbbf24' // gold for the leader
  if (isMe) return '#34d399' // brand green for you
  return MEMBER_COLORS[Math.abs(id) % MEMBER_COLORS.length]
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
  const accent = memberAccent(member.id, isAdminOfMember, isMe)

  return (
    <div
      className="group elevate relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border border-ink-800 bg-ink-900 p-3 pt-5 text-center transition hover:-translate-y-0.5"
      style={{ backgroundImage: `radial-gradient(130% 80% at 50% 0%, ${accent}22, transparent 62%)` }}
    >
      {/* signature colour bar */}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <span className="rounded-full" style={{ boxShadow: `0 0 0 2px ${accent}` }}>
        <MemberAvatar name={member.displayName} avatar={member.avatar} size={50} />
      </span>
      <div className="min-w-0 w-full">
        <div className="truncate text-[15px] font-bold text-ink-100">
          {member.displayName}
          {isMe && <span className="ml-1 text-xs font-medium text-brand-300">(sen)</span>}
        </div>
        {isAdminOfMember ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
            <Crown className="h-2.5 w-2.5" /> Başkan
          </span>
        ) : (
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            Üye
          </span>
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
