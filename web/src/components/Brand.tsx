import { cn } from '@/lib/cn'

// The mark, drawn in currentColor so it inherits the brand green wherever it signs
// the product. Concept: the fourth official's STOPWATCH with the added-time "+" —
// the literal meaning of EXTRATIME (uzatma / ilave süre), and unmistakably football.
export function BallMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* top button / crown of the stopwatch */}
        <line x1="16" y1="6.6" x2="16" y2="3" strokeWidth="2.8" />
        {/* watch face */}
        <circle cx="16" cy="19" r="11" strokeWidth="2.3" />
        {/* hands frozen at the 90+ moment */}
        <line x1="16" y1="19" x2="16" y2="11.4" strokeWidth="2.2" />
        <line x1="16" y1="19" x2="20.6" y2="16.9" strokeWidth="2.2" />
      </g>
      {/* pivot */}
      <circle cx="16" cy="19" r="1.7" fill="currentColor" />
      {/* the "+" of added time — the signature of the name */}
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <line x1="23.1" y1="8" x2="27.9" y2="8" />
        <line x1="25.5" y1="5.6" x2="25.5" y2="10.4" />
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
