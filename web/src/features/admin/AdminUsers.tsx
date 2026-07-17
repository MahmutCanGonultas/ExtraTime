import { useState } from 'react'
import { Shield, KeyRound, Trash2, Pencil, Check, X, ChevronDown } from 'lucide-react'
import {
  useAdminUsers,
  useAdminUserDetail,
  useAdminResetUserPassword,
  useAdminUpdateUser,
  useAdminSetUserAdmin,
  useAdminDeleteUser,
  type AdminUser,
} from './hooks'
import { useAuth } from '@/features/auth/AuthContext'
import { MemberAvatar } from '@/components/MemberAvatar'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

export function AdminUsers() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const { data, isLoading, isError, refetch } = useAdminUsers(search)

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="İsim veya e-posta ara…"
        className="max-w-sm"
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title="Kullanıcı bulunamadı" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-ink-850">
            {data.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isMe={u.id === me?.id}
                expanded={expanded === u.id}
                onToggle={() => setExpanded(expanded === u.id ? null : u.id)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function UserRow({
  user,
  isMe,
  expanded,
  onToggle,
}: {
  user: AdminUser
  isMe: boolean
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-ink-850/60">
        <MemberAvatar name={user.displayName} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink-100">{user.displayName}</span>
            {user.isAdmin && (
              <Badge tone="warning">
                <Shield className="mr-1 h-3 w-3" /> Yönetici
              </Badge>
            )}
            {isMe && <span className="text-[11px] text-ink-500">(sen)</span>}
          </div>
          <div className="truncate text-xs text-ink-400">{user.email}</div>
        </div>
        <div className="hidden shrink-0 gap-4 text-center text-[11px] text-ink-500 sm:flex">
          <span>
            <span className="block text-sm font-bold text-ink-200 tabular-nums">{user.groupCount}</span>
            grup
          </span>
          <span>
            <span className="block text-sm font-bold text-ink-200 tabular-nums">{user.predictionCount}</span>
            tahmin
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-500 transition', expanded && 'rotate-180')} />
      </button>
      {expanded && <UserPanel user={user} isMe={isMe} />}
    </div>
  )
}

function UserPanel({ user, isMe }: { user: AdminUser; isMe: boolean }) {
  const detail = useAdminUserDetail(user.id, true)
  const resetPw = useAdminResetUserPassword()
  const update = useAdminUpdateUser()
  const setAdmin = useAdminSetUserAdmin()
  const del = useAdminDeleteUser()

  const [tempPw, setTempPw] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.displayName)
  const [email, setEmail] = useState(user.email)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function run<T>(p: Promise<T>, after?: () => void) {
    setError(null)
    p.then(() => after?.()).catch((e) => setError(e instanceof ApiError ? e.message : 'İşlem başarısız'))
  }

  return (
    <CardBody className="space-y-4 border-t border-ink-800 bg-ink-950/30">
      {/* Edit name / email */}
      {editing ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-ink-400">
            Görünen ad
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs text-ink-400">
            E-posta
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                run(update.mutateAsync({ userId: user.id, displayName: name, email }), () => setEditing(false))
              }
            >
              <Check className="h-4 w-4" /> Kaydet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Düzenle
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={resetPw.isPending}
            onClick={() => run(resetPw.mutateAsync(user.id).then((r) => setTempPw(r.temporaryPassword)))}
          >
            <KeyRound className="h-4 w-4" /> Şifre sıfırla
          </Button>
          {!user.isEnvAdmin && !isMe && (
            <Button
              size="sm"
              variant="ghost"
              disabled={setAdmin.isPending}
              onClick={() => run(setAdmin.mutateAsync({ userId: user.id, isAdmin: !user.isAdmin }))}
            >
              <Shield className="h-4 w-4" />
              {user.isAdmin ? 'Yöneticiliği al' : 'Yönetici yap'}
            </Button>
          )}
          {!user.isEnvAdmin && !isMe && (
            confirmDelete ? (
              <span className="flex items-center gap-1">
                <span className="text-xs text-loss">Silinsin mi?</span>
                <Button size="sm" variant="danger" disabled={del.isPending} onClick={() => run(del.mutateAsync(user.id))}>
                  Evet, sil
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Sil
              </Button>
            )
          )}
        </div>
      )}

      {tempPw && (
        <div className="rounded-lg border border-brand-500/30 bg-brand-500/[0.06] px-3 py-2 text-sm">
          <span className="text-ink-400">Geçici şifre: </span>
          <span className="font-mono font-bold text-brand-300">{tempPw}</span>
          <span className="ml-2 text-[11px] text-ink-500">kullanıcıya ilet</span>
        </div>
      )}
      {error && <p className="text-sm text-loss">{error}</p>}

      {/* Groups */}
      <div>
        <div className="section-label mb-1.5 text-ink-400">Üye olduğu gruplar</div>
        {detail.isLoading ? (
          <Skeleton className="h-16" />
        ) : detail.data?.groups.length ? (
          <ul className="space-y-1">
            {detail.data.groups.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm text-ink-200">
                <span className="truncate">{g.name}</span>
                {g.isOwner && <Badge tone="brand">başkan</Badge>}
                <span className="ml-auto text-[11px] text-ink-500">{g.memberCount} üye</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">Henüz bir gruba üye değil.</p>
        )}
      </div>

      <p className="text-[11px] text-ink-600">Katılım: {formatDate(user.createdAt)}</p>
    </CardBody>
  )
}
