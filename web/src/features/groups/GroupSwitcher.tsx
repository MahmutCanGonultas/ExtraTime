import { useState } from 'react'
import { ChevronDown, Check, Users } from 'lucide-react'
import { useActiveGroup } from './useActiveGroup'
import { cn } from '@/lib/cn'

// Header control to see and switch the active group. Hidden when the user has no
// group; a plain label when they have exactly one.
export function GroupSwitcher() {
  const { groups, active, select } = useActiveGroup()
  const [open, setOpen] = useState(false)
  if (!active) return null
  const multi = groups.length > 1

  return (
    <div className="relative">
      <button
        onClick={() => multi && setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-900 px-2.5 py-1.5 text-sm text-ink-200',
          multi && 'hover:border-ink-700',
        )}
      >
        <Users className="h-3.5 w-3.5 text-ink-400" />
        <span className="max-w-[8rem] truncate font-medium">{active.name}</span>
        {multi && <ChevronDown className="h-3.5 w-3.5 text-ink-500" />}
      </button>

      {open && multi && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-ink-800 bg-ink-900 p-1 shadow-xl">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  select(g.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-ink-850',
                  g.id === active.id ? 'text-brand-300' : 'text-ink-200',
                )}
              >
                <span className="flex-1 truncate">{g.name}</span>
                {g.id === active.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
