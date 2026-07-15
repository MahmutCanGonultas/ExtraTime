import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'

const navLinks = [
  { to: '/', label: 'Ana Sayfa', end: true },
  { to: '/leagues', label: 'Ligler' },
  { to: '/predictions', label: 'Tahminler' },
  { to: '/group', label: 'Grup' },
  { to: '/stats', label: 'İstatistik' },
  { to: '/admin', label: 'Admin' },
]

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-brand-400">
            <img src="/favicon.svg" width={22} height={22} alt="" />
            <span className="hidden sm:inline">Tahmin Ligi</span>
          </NavLink>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-ink-800 text-brand-300'
                      : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-300 sm:inline">{user?.displayName}</span>
            <button
              onClick={logout}
              className="text-ink-400 transition hover:text-loss"
              title="Çıkış yap"
              aria-label="Çıkış yap"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
