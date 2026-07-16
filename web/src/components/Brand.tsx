import { cn } from '@/lib/cn'

// The ball mark, drawn in currentColor so it inherits the brand green. Used in
// the header, the auth screens and anywhere the product signs itself.
export function BallMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <polygon points="16,9.4 21.9,14 19.6,21 12.4,21 10.1,14" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <line x1="16" y1="9.4" x2="16" y2="2.6" />
        <line x1="21.9" y1="14" x2="29.4" y2="11.5" />
        <line x1="19.6" y1="21" x2="24.2" y2="27.4" />
        <line x1="12.4" y1="21" x2="7.8" y2="27.4" />
        <line x1="10.1" y1="14" x2="2.6" y2="11.5" />
      </g>
    </svg>
  )
}

export function Brand({ className, markSize = 26 }: { className?: string; markSize?: number }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BallMark size={markSize} className="text-brand-400" />
      <span className="font-display text-xl font-bold uppercase tracking-wide text-ink-100">
        Extra<span className="text-brand-400">Time</span>
      </span>
    </span>
  )
}
