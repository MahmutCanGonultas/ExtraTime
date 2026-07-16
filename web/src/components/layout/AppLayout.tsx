import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { GroupSwitcher } from '@/features/groups/GroupSwitcher'
import { Brand } from '@/components/Brand'
import { cn } from '@/lib/cn'

const baseNav = [
  { to: '/', label: 'Ana Sayfa', end: true },
  { to: '/leagues', label: 'Ligler' },
  { to: '/predictions', label: 'Tahminler' },
  { to: '/group', label: 'Grup' },
  { to: '/stats', label: 'İstatistik' },
]

export function AppLayout() {
  const { user, logout, isPlatformAdmin } = useAuth()
  const navLinks = isPlatformAdmin ? [...baseNav, { to: '/admin', label: 'Admin' }] : baseNav

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <NavLink to="/" className="shrink-0">
            <Brand markSize={24} />
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
            <GroupSwitcher />
            <NavLink
              to="/settings"
              className="flex items-center gap-1.5 text-ink-300 transition hover:text-ink-100"
              title="Ayarlar"
            >
              <Settings className="h-5 w-5" />
              <span className="hidden text-sm md:inline">{user?.displayName}</span>
            </NavLink>
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
