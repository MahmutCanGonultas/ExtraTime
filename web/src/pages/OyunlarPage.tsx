import { Link } from 'react-router-dom'
import { Grid3x3, HelpCircle, Users, Swords, Goal, Route as RouteIcon, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type Game = {
  to: string
  title: string
  desc: string
  icon: LucideIcon
  gradient: string
  glow: string
  badge?: 'YENİ' | 'YAKINDA'
  disabled?: boolean
}

const GAMES: Game[] = [
  {
    to: '/kare-bulmaca',
    title: 'Kare Bulmaca',
    desc: 'Günün 3×3 ızgarası — her kareye satır ve sütuna uyan bir oyuncu bul. Nadir cevap çok puan.',
    icon: Grid3x3,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-900/40',
    badge: 'YENİ',
  },
  {
    to: '/kim-bu',
    title: 'Kim Bu?',
    desc: 'İpuçlarıyla gizli oyuncuyu tahmin et. Her tahmin yaş, mevki ve kulübü açar.',
    icon: HelpCircle,
    gradient: 'from-violet-500 to-fuchsia-600',
    glow: 'shadow-violet-900/40',
  },
  {
    to: '/kadro-kur',
    title: 'Kadro Kur',
    desc: 'Sürükle-bırak ile hayalindeki on biri diz. Dizilişini kaydet ve paylaş.',
    icon: Users,
    gradient: 'from-sky-500 to-blue-600',
    glow: 'shadow-sky-900/40',
  },
  {
    to: '/oyun',
    title: 'Düello',
    desc: 'İki oyuncudan hangisi daha iyi? Gol, asist, reyting — günlük 10 soruluk hız turu.',
    icon: Swords,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-900/40',
  },
  {
    to: '/gol-kimin',
    title: 'Gol Kimin?',
    desc: 'Maç, skor ve dakika verilir — golü kimin attığını bil.',
    icon: Goal,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-rose-900/40',
    badge: 'YAKINDA',
    disabled: true,
  },
  {
    to: '/kariyer-zinciri',
    title: 'Kariyer Zinciri',
    desc: 'İki oyuncunun birlikte oynadığı ortak kulübü bul — futbol hafızanı test et.',
    icon: RouteIcon,
    gradient: 'from-indigo-500 to-purple-600',
    glow: 'shadow-indigo-900/40',
    badge: 'YAKINDA',
    disabled: true,
  },
]

function GameCard({ game }: { game: Game }) {
  const Icon = game.icon
  const inner = (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-5 transition',
        game.disabled ? 'opacity-60' : 'hover:-translate-y-0.5 hover:border-ink-700 hover:bg-ink-850',
      )}
    >
      {/* soft corner glow from the game's gradient */}
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition group-hover:opacity-30',
          game.gradient,
        )}
      />
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
            game.gradient,
            game.glow,
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        {game.badge && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              game.badge === 'YENİ'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-ink-800 text-ink-400',
            )}
          >
            {game.badge}
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-ink-50">{game.title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-400">{game.desc}</p>
      {!game.disabled && (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 group-hover:gap-2 transition-all">
          Oyna <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </div>
  )

  if (game.disabled) return inner
  return (
    <Link to={game.to} className="block h-full">
      {inner}
    </Link>
  )
}

export default function OyunlarPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink-50">Oyunlar</h1>
        <p className="mt-1 text-sm text-ink-400">
          Grupça oyna, günlük yarış — futbol bilgini test et.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <GameCard key={g.to} game={g} />
        ))}
      </div>
    </div>
  )
}
