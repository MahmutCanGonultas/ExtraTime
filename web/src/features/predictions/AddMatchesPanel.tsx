import { useState } from 'react'
import { ChevronDown, Plus, Search } from 'lucide-react'
import { useAddGameFixture, useGameCandidates } from '@/features/groups/hooks'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

// Leader-only: browse still-predictable matches from our leagues and add them to
// the current game.
export function AddMatchesPanel({ groupId, gameId }: { groupId: number; gameId: number }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const candidates = useGameCandidates(groupId, gameId, open)
  const add = useAddGameFixture(groupId, gameId)

  const list = (candidates.data ?? []).filter((f) => {
    if (!q) return true
    const t = q.toLocaleLowerCase('tr')
    return (
      f.homeName.toLocaleLowerCase('tr').includes(t) ||
      f.awayName.toLocaleLowerCase('tr').includes(t) ||
      f.leagueName.toLocaleLowerCase('tr').includes(t)
    )
  })

  return (
    <Card>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Plus className="h-4 w-4 text-brand-400" /> Oyuna maç ekle
        </span>
        <ChevronDown className={cn('h-4 w-4 text-ink-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <CardBody className="border-t border-ink-800 pt-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Takım ya da lig ara"
              className="h-9 w-full rounded-lg border border-ink-700 bg-ink-850 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {candidates.isLoading ? (
            <Skeleton className="h-40" />
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              Eklenecek yaklaşan maç bulunamadı.
            </p>
          ) : (
            <ul className="no-scrollbar max-h-80 space-y-1 overflow-y-auto">
              {list.map((f) => (
                <li
                  key={f.fixtureId}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-850"
                >
                  <div className="w-24 shrink-0 text-[11px] text-ink-500">
                    {formatDateTime(f.kickoffAt)}
                  </div>
                  <TeamLogo apiId={f.homeApiId} size={16} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-200">
                    {f.homeName} <span className="text-ink-600">-</span> {f.awayName}
                  </span>
                  <TeamLogo apiId={f.awayApiId} size={16} />
                  <button
                    onClick={() => add.mutate(f.fixtureId)}
                    disabled={add.isPending}
                    className="shrink-0 rounded-md bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-300 transition hover:bg-brand-500/25 disabled:opacity-50"
                  >
                    Ekle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      )}
    </Card>
  )
}
