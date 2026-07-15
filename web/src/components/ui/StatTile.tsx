import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Accent = 'brand' | 'amber' | 'sky' | 'neutral'

const accents: Record<Accent, string> = {
  brand: 'bg-brand-500/12 text-brand-300',
  amber: 'bg-amber-500/12 text-amber-300',
  sky: 'bg-sky-500/12 text-sky-300',
  neutral: 'bg-ink-700/60 text-ink-200',
}

export function StatTile({
  icon,
  label,
  value,
  accent = 'brand',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  accent?: Accent
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-ink-800 bg-ink-900 px-4 py-3">
      <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', accents[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-bold leading-tight text-ink-100">{value}</div>
        <div className="truncate text-xs text-ink-400">{label}</div>
      </div>
    </div>
  )
}
