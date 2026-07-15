import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '@/lib/api'

export interface User {
  id: number
  email: string
  displayName: string
}

interface MeResponse {
  user: User
  isPlatformAdmin: boolean
}

interface AuthContextValue {
  user: User | null
  isPlatformAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadMe() {
    const res = await api.get<MeResponse>('/auth/me')
    setUser(res.user)
    setIsPlatformAdmin(res.isPlatformAdmin)
  }

  // On first load, if a token is stored, confirm it still identifies a real user.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    loadMe()
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string }>('/auth/login', { email, password })
    tokenStore.set(res.token)
    await loadMe()
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await api.post<{ token: string }>('/auth/register', {
      email,
      password,
      displayName,
    })
    tokenStore.set(res.token)
    await loadMe()
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
    setIsPlatformAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, isPlatformAdmin, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
