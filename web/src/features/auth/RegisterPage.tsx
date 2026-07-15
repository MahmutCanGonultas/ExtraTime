import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await register(email, password, displayName)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kayıt yapılamadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Kayıt ol"
      subtitle="Arkadaşlarınla tahmin yarışına katıl"
      footer={
        <>
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="font-medium text-brand-300 hover:underline">
            Giriş yap
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Görünen ad" htmlFor="displayName">
          <Input
            id="displayName"
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field label="E-posta" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Şifre" htmlFor="password" hint="En az 8 karakter">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-loss">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Kayıt olunuyor...' : 'Kayıt ol'}
        </Button>
      </form>
    </AuthShell>
  )
}
