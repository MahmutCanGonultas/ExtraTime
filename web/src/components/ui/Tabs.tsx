import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  key: string
  label: ReactNode
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-ink-800 bg-ink-900/60 p-1">
      {items.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition',
            active === tab.key
              ? 'bg-brand-500 text-ink-950 shadow-sm shadow-brand-950/30'
              : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
