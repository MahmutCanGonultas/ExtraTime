import type { ReactNode } from 'react'
import { Target, Activity, Trophy } from 'lucide-react'
import { Brand, BallMark } from '@/components/Brand'
import { PitchBackdrop } from '@/components/PitchBackdrop'

const HIGHLIGHTS = [
  { icon: Target, text: 'Skor tahmini' },
  { icon: Activity, text: 'Canlı puan durumu' },
  { icon: Trophy, text: 'Haftalık şampiyon' },
]

// The login + register shell: a dramatic floodlit-pitch brand scene on the left
// (desktop) beside a glassy form; on phones the scene becomes a compact artistic
// hero above the form so mobile never looks bare.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── Brand scene (desktop) ── */}
      <aside className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(150deg, #0e2b1f 0%, #123524 38%, #15271e 70%, #12161d 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(58% 48% at 80% 6%, rgba(194,245,66,0.30), transparent 60%), radial-gradient(46% 40% at 12% 96%, rgba(168,230,10,0.12), transparent 60%)',
          }}
        />
        <div className="absolute inset-0 mow-stripes opacity-70" />
        <PitchBackdrop className="pointer-events-none absolute inset-y-0 -right-24 h-full w-[82%] text-white/[0.06]" />
        <BallMark
          size={560}
          className="pointer-events-none absolute -bottom-44 -right-24 text-brand-400/[0.09]"
        />
        <BallMark
          size={104}
          className="animate-float pointer-events-none absolute right-24 top-24 text-brand-300/25"
        />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Brand markSize={34} />

          <div className="max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">
              Arkadaş ligi
            </span>
            <h2 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white xl:text-6xl">
              Maç senden
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
                sorulur.
              </span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-ink-300">
              Grubunla skorları tahmin et, canlı puan durumunu izle, sezonun şampiyonu ol.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {HIGHLIGHTS.map((h) => (
                <span
                  key={h.text}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-ink-200 backdrop-blur-sm"
                >
                  <h.icon className="h-4 w-4 text-brand-300" /> {h.text}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink-500">ExtraTime · arkadaşlar arası futbol ligi</p>
        </div>
      </aside>

      {/* ── Form ── */}
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:min-h-0">
        <div className="relative z-10 w-full max-w-sm">
          {/* Compact artistic hero for phones (the desktop scene is hidden). */}
          <div
            className="relative mb-7 overflow-hidden rounded-3xl border border-brand-500/20 px-6 py-7 text-center lg:hidden"
            style={{
              backgroundImage: 'linear-gradient(150deg, #123524 0%, #16271e 55%, #12161d 100%)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(72% 62% at 72% 0%, rgba(194,245,66,0.24), transparent 60%)',
              }}
            />
            <div className="absolute inset-0 mow-stripes opacity-60" />
            <BallMark
              size={150}
              className="pointer-events-none absolute -right-8 -top-10 text-brand-400/15"
            />
            <div className="relative flex flex-col items-center gap-2">
              <Brand markSize={30} />
              <p className="text-sm text-ink-300">Arkadaşlarınla futbol tahmin ligi</p>
            </div>
          </div>

          <div className="mb-6 lg:mb-7">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-ink-400">{subtitle}</p>}
          </div>

          {/* Glassy form card with a hairline volt top-accent. */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-6 shadow-2xl shadow-ink-950/60 backdrop-blur-xl sm:p-7">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-ink-400">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
