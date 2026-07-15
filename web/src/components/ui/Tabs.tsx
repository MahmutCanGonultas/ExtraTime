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
    <div className="flex gap-1 overflow-x-auto border-b border-ink-800">
      {items.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
            active === tab.key
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-ink-400 hover:text-ink-200',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
