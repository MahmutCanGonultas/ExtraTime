import { Link } from 'react-router-dom'
import {
  Grid3x3,
  HelpCircle,
  Goal,
  Route as RouteIcon,
  ArrowRight,
  Check,
  Link2,
  Gamepad2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ArenaShell, GAME_THEMES, GameHero } from '@/features/games/ui'

type Preview = 'grid' | 'goal' | 'career' | 'guess' | 'duel'

type Game = {
  to: string
  title: string
  desc: string
  tagline: string
  icon: LucideIcon
  grad: string
  glow: string
  preview: Preview
  badge?: 'YENİ'
}

const GAMES: Game[] = [
  {
    to: '/kare-bulmaca',
    title: 'Kare Bulmaca',
    tagline: 'Günün ızgarası',
    desc: '3×3 ızgarada her kareye satır ve sütuna uyan oyuncuyu bul. Nadir cevap = çok puan.',
    icon: Grid3x3,
    grad: 'from-emerald-400 via-teal-500 to-cyan-500',
    glow: 'rgba(16,185,129,0.45)',
    preview: 'grid',
    badge: 'YENİ',
  },
  {
    to: '/gol-kimin',
    title: 'Gol Kimin?',
    tagline: 'Günlük 10 soru',
    desc: 'Maç, skor ve dakika verilir — golü kimin attığını dört şıktan bul.',
    icon: Goal,
    grad: 'from-amber-400 via-orange-500 to-rose-600',
    glow: 'rgba(249,115,22,0.45)',
    preview: 'goal',
    badge: 'YENİ',
  },
  {
    to: '/kariyer-zinciri',
    title: 'Kariyer Zinciri',
    tagline: 'Ortak kulübü bul',
    desc: 'İki yıldızın birlikte forma giydiği ortak kulübü seç. Futbol hafızanı test et.',
    icon: RouteIcon,
    grad: 'from-violet-400 via-indigo-500 to-fuchsia-600',
    glow: 'rgba(139,92,246,0.45)',
    preview: 'career',
    badge: 'YENİ',
  },
  {
    to: '/kim-bu',
    title: 'Kim Bu?',
    tagline: 'Gizli oyuncu',
    desc: 'İpuçlarıyla gizli oyuncuyu çöz. Her tahmin yaş, mevki ve kulübü açar.',
    icon: HelpCircle,
    grad: 'from-fuchsia-400 via-purple-500 to-indigo-600',
    glow: 'rgba(192,38,211,0.4)',
    preview: 'guess',
  },
]

// ── Per-game preview art (a stylised glimpse of the game's content) ──────────
function PreviewArt({ kind }: { kind: Preview }) {
  if (kind === 'grid') {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-[5px] border',
              i === 0 || i === 4 || i === 8
                ? 'border-white/40 bg-white/25'
                : 'border-white/20 bg-white/5',
            )}
          >
            {(i === 0 || i === 4 || i === 8) && <Check className="h-3.5 w-3.5 text-white" />}
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'goal') {
    return (
      <div className="flex items-center gap-2 text-white">
        <div className="h-7 w-7 rounded-full bg-white/25 ring-1 ring-white/40" />
        <div className="font-display text-2xl font-bold leading-none">
          2<span className="mx-1 opacity-60">-</span>1
        </div>
        <div className="h-7 w-7 rounded-full bg-white/15 ring-1 ring-white/30" />
        <span className="ml-1 rounded-full bg-black/30 px-2 py-0.5 text-xs font-bold">⚽ ?</span>
      </div>
    )
  }
  if (kind === 'career') {
    return (
      <div className="flex items-center gap-1.5 text-white">
        <div className="h-8 w-8 rounded-full bg-white/25 ring-1 ring-white/40" />
        <Link2 className="h-4 w-4 opacity-80" />
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-black/30 text-xs font-bold">
          ?
        </div>
        <Link2 className="h-4 w-4 opacity-80" />
        <div className="h-8 w-8 rounded-full bg-white/15 ring-1 ring-white/30" />
      </div>
    )
  }
  if (kind === 'guess') {
    return (
      <div className="flex items-center gap-2 text-white">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-2xl font-black ring-1 ring-white/30">
          ?
        </div>
        <div className="space-y-1">
          <div className="h-2 w-16 rounded-full bg-white/30" />
          <div className="h-2 w-10 rounded-full bg-white/20" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-white">
      <div className="h-9 w-12 rounded-lg bg-white/25 ring-1 ring-white/40" />
      <span className="font-display text-lg font-bold">VS</span>
      <div className="h-9 w-12 rounded-lg bg-white/15 ring-1 ring-white/30" />
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const Icon = game.icon
  return (
    <Link to={game.to} className="group block">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20"
        style={{ boxShadow: `0 18px 50px -24px ${game.glow}` }}
      >
        {/* Preview banner */}
        <div className={cn('relative h-28 overflow-hidden bg-gradient-to-br', game.grad)}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.35),transparent_60%)]" />
          <Icon className="absolute -bottom-4 -right-3 h-24 w-24 text-white/15 transition-transform duration-500 group-hover:scale-110" />
          <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100" />
          <div className="absolute inset-0 flex items-center px-5">
            <PreviewArt kind={game.preview} />
          </div>
          {game.badge && (
            <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur">
              {game.badge}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-ink-50">
              {game.title}
            </h3>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            {game.tagline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">{game.desc}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-white transition-all group-hover:gap-2">
            Oyna <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function OyunlarPage() {
  return (
    <ArenaShell theme={GAME_THEMES.hub} maxW="max-w-5xl">
      <GameHero
        theme={GAME_THEMES.hub}
        icon={Gamepad2}
        title="Oyunlar"
        subtitle="Grupça oyna, günlük yarış — futbol bilgini test et"
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <GameCard key={g.to} game={g} />
        ))}
      </div>
    </ArenaShell>
  )
}
