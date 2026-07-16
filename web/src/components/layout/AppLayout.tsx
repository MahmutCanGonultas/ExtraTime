import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { GroupSwitcher } from '@/features/groups/GroupSwitcher'
import { Brand, BallMark } from '@/components/Brand'
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
    <div className="flex min-h-screen flex-col">
      <div className="h-1 bg-brand-500" />
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
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
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-ink-950'
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

      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-12 border-t border-ink-800 bg-ink-950/40">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-brand-300">
              <BallMark size={18} />
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-ink-200">ExtraTime</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              ExtraTime, yazılım geliştirme yetkinliklerini sergilemek amacıyla hazırlanmış kişisel
              bir portföy projesidir. Herhangi bir ticari amaç taşımaz; bahis, kumar ya da her türlü
              maddi kazanç unsuru içermez ve kullanıcılarından hiçbir finansal beklentisi yoktur.
              Tahmin oyunu yalnızca arkadaş grupları arasında, tamamen eğlence amacıyla oynanır.
              Futbol verileri üçüncü taraf servislerden sağlanmakta olup tüm takım adları, logolar ve
              marka hakları ilgili sahiplerine aittir.
            </p>
          </div>
          <div className="text-xs text-ink-600 md:text-right">
            <div className="font-medium text-ink-400">Portföy Projesi</div>
            <div className="mt-1">Ticari amaç güdülmez</div>
            <div className="mt-3 text-ink-600">© {year} ExtraTime</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
