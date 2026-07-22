import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

// ── Shared "arena" design language for the games ────────────────────────────
// Every game surface is an immersive dark arena: drifting accent glow orbs, a
// faint pitch grid, a vignette, and a glowing hero medallion. Each game owns a
// signature multi-hue palette so it feels distinct yet part of one family.

export interface GameTheme {
  grad: string // tailwind gradient classes for medallions / accents
  text: string // gradient text classes for the title
  glow1: string // rgba orb colour A
  glow2: string // rgba orb colour B
  accent: string // solid accent (hex) for fine details
  ring: string // ring/border tailwind class
  chip: string // subtle tinted chip background
}

export const GAME_THEMES: Record<string, GameTheme> = {
  hub: {
    grad: 'from-emerald-400 via-cyan-500 to-violet-500',
    text: 'from-emerald-300 via-cyan-200 to-violet-300',
    glow1: 'rgba(16,185,129,0.45)',
    glow2: 'rgba(139,92,246,0.42)',
    accent: '#22d3ee',
    ring: 'ring-cyan-400/30',
    chip: 'bg-cyan-500/10',
  },
  kare: {
    grad: 'from-emerald-400 via-teal-500 to-cyan-500',
    text: 'from-emerald-300 via-teal-200 to-cyan-300',
    glow1: 'rgba(16,185,129,0.55)',
    glow2: 'rgba(6,182,212,0.45)',
    accent: '#10b981',
    ring: 'ring-emerald-400/30',
    chip: 'bg-emerald-500/10',
  },
  gol: {
    grad: 'from-amber-400 via-orange-500 to-rose-600',
    text: 'from-amber-200 via-orange-300 to-rose-400',
    glow1: 'rgba(249,115,22,0.5)',
    glow2: 'rgba(244,63,94,0.45)',
    accent: '#fb7185',
    ring: 'ring-orange-400/30',
    chip: 'bg-orange-500/10',
  },
  kariyer: {
    grad: 'from-violet-400 via-indigo-500 to-fuchsia-600',
    text: 'from-violet-200 via-indigo-200 to-fuchsia-300',
    glow1: 'rgba(139,92,246,0.5)',
    glow2: 'rgba(217,70,239,0.4)',
    accent: '#a78bfa',
    ring: 'ring-violet-400/30',
    chip: 'bg-violet-500/10',
  },
  legends: {
    grad: 'from-amber-300 via-yellow-500 to-amber-600',
    text: 'from-amber-200 via-yellow-200 to-amber-300',
    glow1: 'rgba(245,196,63,0.42)',
    glow2: 'rgba(217,119,6,0.35)',
    accent: '#fbbf24',
    ring: 'ring-amber-400/30',
    chip: 'bg-amber-500/10',
  },
}

// The immersive backdrop + centred content column. Kept absolute-in-relative so
// it never fights the sticky nav's z-index.
export function ArenaShell({
  theme,
  children,
  maxW = 'max-w-3xl',
}: {
  theme: GameTheme
  children: ReactNode
  maxW?: string
}) {
  return (
    <div className="relative min-h-[88vh] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a1120]" />
        {/* drifting glow orbs */}
        <div
          className="animate-orb absolute -top-[18%] left-1/2 h-[62vh] w-[62vh] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: theme.glow1 }}
        />
        <div
          className="animate-orb-slow absolute bottom-[-15%] right-[-10%] h-[52vh] w-[52vh] rounded-full blur-[130px]"
          style={{ background: theme.glow2 }}
        />
        <div
          className="animate-glow absolute left-[-12%] top-[38%] h-[40vh] w-[40vh] rounded-full blur-[120px]"
          style={{ background: theme.glow1 }}
        />
        {/* faint pitch grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />
        {/* vignette + floor fade */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,9,18,0.85)_100%)]" />
      </div>

      <div className={cn('relative z-10 mx-auto px-4 py-7', maxW)}>{children}</div>
    </div>
  )
}

// A glowing medallion + gradient title. The header for every game page.
export function GameHero({
  theme,
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  theme: GameTheme
  icon: LucideIcon
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <header className="mb-6 flex items-center gap-4">
      <div className="relative">
        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-br blur-lg opacity-70',
            theme.grad,
          )}
        />
        <div
          className={cn(
            'relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-xl ring-1 ring-white/20',
            theme.grad,
          )}
        >
          <span className="pointer-events-none absolute inset-0 opacity-40 [animation:sheen_3.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <Icon className="relative h-7 w-7 text-white drop-shadow" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            'bg-gradient-to-r bg-clip-text font-display text-3xl font-bold uppercase tracking-wide text-transparent',
            theme.text,
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-300">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

// A frosted glass surface for content blocks on the arena.
export function GlassPanel({
  children,
  className,
  glow,
}: {
  children: ReactNode
  className?: string
  glow?: string
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl',
        className,
      )}
      style={glow ? { boxShadow: `0 0 40px -12px ${glow}` } : undefined}
    >
      {children}
    </div>
  )
}
