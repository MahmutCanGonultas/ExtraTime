import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api, ApiError } from '@/lib/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input, Field } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SettingsPage() {
  const { user, refresh } = useAuth()
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-ink-100">Ayarlar</h1>
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
