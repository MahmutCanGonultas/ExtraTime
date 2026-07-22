import { useId } from 'react'
import { cn } from '@/lib/cn'

// The mark: the fourth official's ADDED-TIME BOARD — the glowing "+" panel raised
// at 90' that literally means extra time (uzatma). Bold, gradient-lit and tilted
// for momentum, so it reads as an emblem rather than a plain icon. `mono` renders
// a single-colour (currentColor) silhouette for faded watermarks / decoration.
export function BallMark({
  size = 24,
  className,
  mono = false,
}: {
  size?: number
  className?: string
  mono?: boolean
}) {
  const id = useId().replace(/[:]/g, '')
  const g = `et-grad-${id}`
  const glow = `et-glow-${id}`

  if (mono) {
    return (
      <svg viewBox="0 0 32 32" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
        <g
          transform="rotate(-7 16 16)"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="8" width="25" height="16" rx="4.4" strokeWidth="2.2" />
          <line x1="16" y1="12.4" x2="16" y2="19.6" strokeWidth="2.8" />
          <line x1="12.4" y1="16" x2="19.6" y2="16" strokeWidth="2.8" />
        </g>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.5" stopColor="#10b981" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="rotate(-7 16 16)">
        {/* board body */}
        <rect x="3" y="7.5" width="26" height="17" rx="4.6" fill={`url(#${g})`} />
        {/* soft top highlight */}
        <rect x="4.6" y="9" width="22.8" height="6" rx="3" fill="#ffffff" opacity="0.18" />
        {/* LED screen */}
        <rect x="6" y="10.2" width="20" height="11.6" rx="2.8" fill="#081019" />
        {/* the glowing "+" of added time */}
        <g stroke="#5eead4" strokeWidth="2.8" strokeLinecap="round" filter={`url(#${glow})`}>
          <line x1="16" y1="12.4" x2="16" y2="19.6" />
          <line x1="12.4" y1="16" x2="19.6" y2="16" />
        </g>
      </g>
    </svg>
  )
}

export function Brand({ className, markSize = 26 }: { className?: string; markSize?: number }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BallMark size={markSize} />
      {/* Literal Latin caps so the Turkish page locale can't turn the "i" into a
          dotted "İ" via text-transform — the brand is EXTRATIME. */}
      <span className="font-display text-xl font-extrabold tracking-tight text-ink-50">
        EXTRA
        <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
          TIME
        </span>
      </span>
    </span>
  )
}
