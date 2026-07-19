import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { TrophyCabinet } from '@/features/groups/TrophyCabinet'
import { api, ApiError } from '@/lib/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input, Field } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MemberAvatar } from '@/components/MemberAvatar'
import { AVATARS } from '@/components/avatarPresets'
import { cn } from '@/lib/cn'

export function SettingsPage() {
  const { user, refresh } = useAuth()
  const { active } = useActiveGroup()
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-ink-100">Ayarlar</h1>
      {active && user && <TrophyCabinet groupId={active.id} userId={user.id} />}
      <AvatarForm
        current={user?.avatar ?? null}
        name={user?.displayName ?? ''}
        onSaved={refresh}
      />
      <NameForm current={user?.displayName ?? ''} onSaved={refresh} />
      <PasswordForm />
      <Card>
        <CardHeader title="Hesap" />
        <CardBody className="text-sm text-ink-300">
          E-posta: <span className="text-ink-100">{user?.email}</span>
        </CardBody>
      </Card>
    </div>
  )
}

function Note({ ok, err }: { ok?: boolean; err?: string | null }) {
  if (err) return <span className="text-xs text-loss">{err}</span>
  if (ok)
    return (
      <span className="flex items-center gap-1 text-xs text-brand-300">
        <Check className="h-3.5 w-3.5" /> Kaydedildi
      </span>
    )
  return <span />
}

function AvatarForm({
  current,
  name,
  onSaved,
}: {
  current: string | null
  name: string
  onSaved: () => Promise<void>
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function pick(id: string) {
    if (id === current || saving) return
    setErr(null)
    setSaving(id)
    try {
      await api.patch('/auth/me', { avatar: id })
      await onSaved()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card>
      <CardHeader title="Avatar" />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          <MemberAvatar name={name} avatar={current} size={56} />
          <div className="text-sm text-ink-300">
            Sıralamada, tahminlerde ve üye listesinde bu avatar görünür.
            <div className="mt-0.5 text-xs text-ink-500">Bir tane seç, hemen kaydedilir.</div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2.5">
          {AVATARS.map((a) => {
            const selected = a.id === current
            return (
              <button
                key={a.id}
                onClick={() => pick(a.id)}
                disabled={saving !== null}
                aria-label={a.label}
                aria-pressed={selected}
                title={a.label}
                className={cn(
                  'relative flex items-center justify-center rounded-xl p-1.5 transition',
                  selected
                    ? 'bg-brand-500/20 ring-2 ring-brand-400'
                    : 'ring-1 ring-ink-800 hover:bg-ink-850 hover:ring-ink-600',
                )}
              >
                <MemberAvatar name={name} avatar={a.id} size={44} />
                {selected && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-400 text-ink-950">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {err && <p className="text-xs text-loss">{err}</p>}
      </CardBody>
    </Card>
  )
}

function NameForm({ current, onSaved }: { current: string; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(current)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setOk(false)
    setSaving(true)
    try {
      await api.patch('/auth/me', { displayName: name.trim() })
      await onSaved()
      setOk(true)
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Görünen ad" />
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Ad">
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={50} />
          </Field>
          <div className="flex items-center justify-between">
            <Note ok={ok} err={err} />
            <Button type="submit" disabled={saving || name.trim().length < 2 || name.trim() === current}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function PasswordForm() {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const valid = cur.length >= 1 && next.length >= 8 && next === confirm

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setOk(false)
    if (next !== confirm) {
      setErr('Yeni şifreler eşleşmiyor')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: cur, newPassword: next })
      setOk(true)
      setCur('')
      setNext('')
      setConfirm('')
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Değiştirilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Şifre değiştir" />
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Mevcut şifre">
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required />
          </Field>
          <Field label="Yeni şifre (en az 8 karakter)">
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </Field>
          <Field label="Yeni şifre (tekrar)">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <div className="flex items-center justify-between">
            <Note ok={ok} err={err} />
            <Button type="submit" disabled={saving || !valid}>
              {saving ? 'Değiştiriliyor...' : 'Şifreyi değiştir'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
