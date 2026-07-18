import type { ReactNode } from 'react'
import { Target, Activity, Trophy } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { PitchBackdrop } from '@/components/PitchBackdrop'

// Product highlights shown on the brand panel — so the sign-in screen reads like
// a real product, not a bare form.
const HIGHLIGHTS = [
  { icon: Target, title: 'Skor tahmin oyunu', text: 'Grubunla her hafta maç skorlarını tahmin et, puan topla.' },
  { icon: Activity, title: 'Canlı puan durumu', text: 'Maçlar oynanırken sıralama anında güncellenir.' },
  { icon: Trophy, title: 'Haftalık şampiyonlar', text: 'Her hafta bir şampiyon, sezon sonunda kupa.' },
]

// The shell for the login + register screens: a floodlit-stadium brand panel on
// the left (lg+), and the form card on the right. Collapses to just the form,
// centred, on phones.
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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand / hero panel (desktop only) ── */}
      <aside
        className="relative hidden overflow-hidden lg:block"
        style={{
          backgroundImage: 'linear-gradient(140deg, #18402f 0%, #17352a 45%, #1a1f27 100%)',
        }}
      >
        <div className="absolute inset-0 mow-stripes" />
        {/* Floodlight glow from the top corner */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(70% 55% at 85% -5%, rgba(194,245,66,0.20), transparent 60%)',
          }}
        />
        <PitchBackdrop className="pointer-events-none absolute -right-16 top-1/2 h-[130%] w-[85%] -translate-y-1/2 text-brand-200/10" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Brand markSize={30} />

          <div className="max-w-md">
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white xl:text-5xl">
              Maç senden
              <br />
              <span className="text-brand-400">sorulur.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-300">
              Arkadaş grubunun futbol tahmin ligi. Tahmin et, puanları topla, sezonun
              şampiyonu ol.
            </p>

            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/25">
                    <h.icon className="h-4.5 w-4.5 text-brand-300" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-100">{h.title}</span>
                    <span className="block text-[13px] leading-snug text-ink-400">{h.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-ink-500">ExtraTime · arkadaşlar arası futbol ligi</p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Brand mark on top for phones, where the hero panel is hidden. */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand markSize={28} />
          </div>

          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-100">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-ink-400">{subtitle}</p>}
          </div>

          {/* The form itself, on a raised card with a thin volt top-accent. */}
          <div className="relative overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/70 p-6 shadow-2xl shadow-ink-950/50 ring-1 ring-white/5 backdrop-blur-sm sm:p-7">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-ink-400">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
