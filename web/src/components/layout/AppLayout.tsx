import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, Settings, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { GroupSwitcher } from '@/features/groups/GroupSwitcher'
import { SearchBar } from '@/features/football/SearchBar'
import { Brand, BallMark } from '@/components/Brand'
import { cn } from '@/lib/cn'

const baseNav = [
  { to: '/', label: 'Ana Sayfa', end: true },
  { to: '/leagues', label: 'Ligler' },
  { to: '/group', label: 'Grup' },
  { to: '/kadro-kur', label: 'Kadro Kur' },
  { to: '/kim-bu', label: 'Kim Bu?' },
]

export function AppLayout() {
  const { user, logout, isPlatformAdmin } = useAuth()
  const navLinks = isPlatformAdmin ? [...baseNav, { to: '/admin', label: 'Admin' }] : baseNav
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition',
      isActive ? 'bg-brand-500 text-ink-950' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
    )

  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-1 bg-brand-500" />
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <NavLink to="/" className="shrink-0">
            <Brand markSize={24} />
          </NavLink>

          {/* Desktop navigation */}
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop account cluster */}
          <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
            <div className="w-52 xl:w-72">
              <SearchBar />
            </div>
            <GroupSwitcher />
            <NavLink
              to="/settings"
              className="flex items-center gap-1.5 text-ink-300 transition hover:text-ink-100"
              title="Ayarlar"
            >
              <Settings className="h-5 w-5" />
              <span className="hidden text-sm xl:inline">{user?.displayName}</span>
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-200 transition hover:bg-ink-850 lg:hidden"
            aria-label="Menü"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="border-t border-ink-800 bg-ink-950 px-4 pb-4 pt-3 lg:hidden">
            <div className="mb-3">
              <SearchBar />
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2.5 text-[15px] font-semibold transition',
                      isActive
                        ? 'bg-brand-500 text-ink-950'
                        : 'text-ink-200 hover:bg-ink-850 hover:text-ink-100',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="my-3 border-t border-ink-800" />
            <div className="flex items-center justify-between gap-3">
              <GroupSwitcher />
              <div className="flex items-center gap-4">
                <NavLink
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 text-sm text-ink-300 transition hover:text-ink-100"
                >
                  <Settings className="h-5 w-5" />
                  <span className="max-w-[120px] truncate">{user?.displayName}</span>
                </NavLink>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-loss"
                  aria-label="Çıkış yap"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:py-9">
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
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-ink-200">EXTRATIME</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              EXTRATIME, yazılım geliştirme yetkinliklerini sergilemek amacıyla hazırlanmış kişisel
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
            <div className="mt-3 text-ink-600">© {year} EXTRATIME</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
