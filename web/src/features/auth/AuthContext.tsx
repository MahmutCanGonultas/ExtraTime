import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '@/lib/api'

export interface User {
  id: number
  email: string
  displayName: string
}

interface AuthResult {
  user: User
  token: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On first load, if a token is stored, confirm it still identifies a real user.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post<AuthResult>('/auth/login', { email, password })
    tokenStore.set(res.token)
    setUser(res.user)
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await api.post<AuthResult>('/auth/register', { email, password, displayName })
    tokenStore.set(res.token)
    setUser(res.user)
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
