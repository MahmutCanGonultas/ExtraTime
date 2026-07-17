import { useState } from 'react'
import { Pencil, Trash2, RefreshCw, UserPlus, ArrowLeftRight, Check, X, ChevronDown, Copy } from 'lucide-react'
import {
  useAdminAllGroups,
  useAdminRenameGroup,
  useAdminDeleteGroup,
  useAdminTransferGroup,
  useAdminRegenerateInvite,
  useAdminAddMember,
  type AdminGroup,
} from './hooks'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

export function AdminGroups() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const { data, isLoading, isError, refetch } = useAdminAllGroups()

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Henüz grup yok" />

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-ink-850">
        {data.map((g) => (
          <GroupRow
            key={g.id}
            group={g}
            expanded={expanded === g.id}
            onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
          />
        ))}
      </div>
    </Card>
  )
}

function GroupRow({ group, expanded, onToggle }: { group: AdminGroup; expanded: boolean; onToggle: () => void }) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-ink-850/60">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink-100">{group.name}</div>
          <div className="truncate text-xs text-ink-400">
            başkan: {group.ownerName ?? '—'} · {group.memberCount} üye · {group.gameCount} oyun
          </div>
        </div>
        <span className="hidden shrink-0 font-mono text-[11px] tracking-widest text-ink-500 sm:inline">
          {group.inviteCode}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-500 transition', expanded && 'rotate-180')} />
      </button>
      {expanded && <GroupPanel group={group} />}
    </div>
  )
}

function GroupPanel({ group }: { group: AdminGroup }) {
  const rename = useAdminRenameGroup()
  const del = useAdminDeleteGroup()
  const transfer = useAdminTransferGroup()
  const regen = useAdminRegenerateInvite()
  const addMember = useAdminAddMember()

  const [name, setName] = useState(group.name)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run<T>(p: Promise<T>, ok?: (r: T) => void) {
    setError(null)
    setMsg(null)
    p.then((r) => ok?.(r)).catch((e) => setError(e instanceof ApiError ? e.message : 'İşlem başarısız'))
  }

  return (
    <CardBody className="grid gap-4 border-t border-ink-800 bg-ink-950/30 sm:grid-cols-2">
      {/* Rename */}
      <div className="space-y-1.5">
        <div className="section-label text-ink-400">Grup adı</div>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            size="sm"
            variant="secondary"
            disabled={rename.isPending || name.trim() === group.name}
            onClick={() => run(rename.mutateAsync({ groupId: group.id, name }), () => setMsg('Ad güncellendi'))}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Invite code */}
      <div className="space-y-1.5">
        <div className="section-label text-ink-400">Davet kodu</div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm font-bold tracking-widest text-brand-300">
            {group.inviteCode}
          </span>
          <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(group.inviteCode)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={regen.isPending}
            onClick={() => run(regen.mutateAsync(group.id), () => setMsg('Yeni davet kodu üretildi'))}
          >
            <RefreshCw className="h-4 w-4" /> Yenile
          </Button>
        </div>
      </div>

      {/* Transfer owner */}
      <div className="space-y-1.5">
        <div className="section-label text-ink-400">Başkanlığı devret</div>
        <div className="flex gap-2">
          <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="yeni başkan e-postası" />
          <Button
            size="sm"
            variant="secondary"
            disabled={transfer.isPending || !ownerEmail.trim()}
            onClick={() =>
              run(transfer.mutateAsync({ groupId: group.id, email: ownerEmail }), () => {
                setOwnerEmail('')
                setMsg('Başkanlık devredildi')
              })
            }
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add member */}
      <div className="space-y-1.5">
        <div className="section-label text-ink-400">Üye ekle</div>
        <div className="flex gap-2">
          <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="e-posta" />
          <Button
            size="sm"
            variant="secondary"
            disabled={addMember.isPending || !memberEmail.trim()}
            onClick={() =>
              run(addMember.mutateAsync({ groupId: group.id, email: memberEmail }), () => {
                setMemberEmail('')
                setMsg('Üye eklendi')
              })
            }
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="sm:col-span-2">
        {msg && <p className="text-sm text-brand-300">{msg}</p>}
        {error && <p className="text-sm text-loss">{error}</p>}
      </div>

      {/* Danger: delete */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-loss/20 px-3 py-2 sm:col-span-2">
        <div className="text-xs text-ink-400">
          Grubu sil — tüm oyunlar, tahminler ve geçmiş kalıcı olarak silinir.
        </div>
        {confirmDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-loss">Emin misin?</span>
            <Button size="sm" variant="danger" disabled={del.isPending} onClick={() => run(del.mutateAsync(group.id))}>
              Evet, sil
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="danger" className="shrink-0" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Sil
          </Button>
        )}
      </div>

      <p className="text-[11px] text-ink-600 sm:col-span-2">
        <Check className="mr-1 inline h-3 w-3" />
        Kuruluş: {formatDate(group.createdAt)}
      </p>
    </CardBody>
  )
}
