import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'brand' | 'win' | 'draw' | 'loss' | 'warning'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-800 text-ink-200',
  brand: 'bg-brand-500/15 text-brand-300',
  win: 'bg-win/15 text-win',
  draw: 'bg-ink-700 text-ink-200',
  loss: 'bg-loss/15 text-loss',
  warning: 'bg-amber-500/15 text-amber-300',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
