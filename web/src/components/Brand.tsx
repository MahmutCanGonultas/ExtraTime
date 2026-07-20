import { cn } from '@/lib/cn'

// 12 clock ticks around the face — computed so they sit evenly on the rim.
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 30 - 90) * Math.PI) / 180
  const cx = 16
  const cy = 18.6
  const major = i % 3 === 0
  const rOuter = 10.4
  const rInner = major ? 8.4 : 9.1
  return {
    x1: +(cx + Math.cos(a) * rOuter).toFixed(2),
    y1: +(cy + Math.sin(a) * rOuter).toFixed(2),
    x2: +(cx + Math.cos(a) * rInner).toFixed(2),
    y2: +(cy + Math.sin(a) * rInner).toFixed(2),
    w: major ? 1.5 : 1,
  }
})

// The mark, in currentColor so it inherits the brand green wherever it signs the
// product. Concept: the fourth official's STOPWATCH with the added-time "+" — the
// literal meaning of EXTRATIME (uzatma / ilave süre), and unmistakably football.
export function BallMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* crown: centre button + two angled pushers */}
        <line x1="16" y1="6.2" x2="16" y2="2.6" strokeWidth="2.8" />
        <line x1="11.4" y1="4.3" x2="13.3" y2="6.1" strokeWidth="2.1" />
        <line x1="20.6" y1="4.3" x2="18.7" y2="6.1" strokeWidth="2.1" />
        {/* face */}
        <circle cx="16" cy="18.6" r="11" strokeWidth="2.3" />
      </g>
      {/* clock ticks */}
      <g stroke="currentColor" strokeLinecap="round" opacity="0.6">
        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth={t.w} />
        ))}
      </g>
      {/* hands, frozen at the 90+ moment */}
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <line x1="16" y1="18.6" x2="16" y2="11.4" strokeWidth="2.1" />
        <line x1="16" y1="18.6" x2="20.4" y2="16.6" strokeWidth="2.1" />
      </g>
      {/* pivot */}
      <circle cx="16" cy="18.6" r="1.6" fill="currentColor" />
      {/* the "+" of added time — the signature of the name */}
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <line x1="23.2" y1="7.6" x2="27.8" y2="7.6" />
        <line x1="25.5" y1="5.3" x2="25.5" y2="9.9" />
      </g>
    </svg>
  )
}

export function Brand({ className, markSize = 26 }: { className?: string; markSize?: number }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BallMark size={markSize} className="text-brand-400" />
      {/* Literal Latin caps so the Turkish page locale can't turn the "i" into a
          dotted "İ" via text-transform — the brand is EXTRATIME. */}
      <span className="font-display text-xl font-extrabold tracking-tight text-ink-100">
        EXTRA<span className="text-brand-400">TIME</span>
      </span>
    </span>
  )
}
