import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, Settings, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { GroupSwitcher } from '@/features/groups/GroupSwitcher'
import { SearchBar } from '@/features/football/SearchBar'
import { Brand, BallMark } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/cn'

const baseNav = [
  { to: '/', label: 'Ana Sayfa', end: true },
  { to: '/leagues', label: 'Ligler' },
  { to: '/group', label: 'Grup' },
  { to: '/oyunlar', label: 'Oyunlar' },
]

export function AppLayout() {
  const { user, logout, isPlatformAdmin } = useAuth()
  const navLinks = isPlatformAdmin ? [...baseNav, { to: '/admin', label: 'Admin' }] : baseNav
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname])

  // Lock body scroll while the mobile drawer is open (so the page behind it doesn't
  // scroll under the overlay).
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition',
      isActive ? 'bg-brand-500 text-ink-950' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
    )

  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-emerald-400" />
      <header className="sticky top-0 z-30 border-b border-ink-800/70 bg-ink-950/70 backdrop-blur-xl">
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
            <ThemeToggle />
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

      </header>

      {/* Mobile drawer — a proper slide-in panel over a tap-to-close backdrop. */}
      <div
        className={cn('fixed inset-0 z-40 lg:hidden', !menuOpen && 'pointer-events-none')}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={cn(
            'absolute inset-0 bg-ink-950/70 backdrop-blur-sm transition-opacity duration-300',
            menuOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute right-0 top-0 flex h-full w-[84%] max-w-xs flex-col border-l border-ink-800 bg-ink-950 shadow-2xl transition-transform duration-300 ease-out',
            menuOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          {/* panel header */}
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
            <Brand markSize={22} />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Kapat"
              className="grid h-9 w-9 place-items-center rounded-md text-ink-300 transition hover:bg-ink-850 hover:text-ink-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* scrollable body: search + nav links */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <SearchBar />
            <nav className="mt-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-3 text-[15px] font-semibold transition',
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
          </div>

          {/* account footer — one clear row each */}
          <div className="space-y-1 border-t border-ink-800 px-4 py-3">
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Grup</span>
              <GroupSwitcher />
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-ink-300">Tema</span>
              <ThemeToggle />
            </div>
            <NavLink
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between gap-3 rounded-lg py-2 text-ink-200 transition hover:text-ink-100"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-5 w-5" /> Ayarlar
              </span>
              <span className="max-w-[120px] truncate text-xs text-ink-500">{user?.displayName}</span>
            </NavLink>
            <button
              onClick={() => {
                setMenuOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-2 rounded-lg py-2 text-sm font-medium text-ink-400 transition hover:text-loss"
            >
              <LogOut className="h-5 w-5" /> Çıkış yap
            </button>
          </div>
        </aside>
      </div>

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
