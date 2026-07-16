import { useState } from 'react'
import { TeamLogo } from '@/components/TeamLogo'
import { LiveMatchCard } from './LiveMatchCard'
import type { Fixture } from './types'
import { cn } from '@/lib/cn'

interface Group {
  apiId: number
  name: string
  fixtures: Fixture[]
}

// Live matches grouped by competition, with filter chips carrying each
// competition's live count — so "3 Şampiyonlar Ligi, 2 Bundesliga" is obvious at
// a glance and one tap narrows to a single competition.
export function LiveMatches({ fixtures }: { fixtures: Fixture[] }) {
  const [sel, setSel] = useState<number | 'all'>('all')

  const groups: Group[] = []
  const byId = new Map<number, Group>()
  for (const f of fixtures) {
    let g = byId.get(f.leagueApiId)
    if (!g) {
      g = { apiId: f.leagueApiId, name: f.leagueName, fixtures: [] }
      byId.set(f.leagueApiId, g)
      groups.push(g)
    }
    g.fixtures.push(f)
  }
  groups.sort((a, b) => b.fixtures.length - a.fixtures.length || a.name.localeCompare(b.name, 'tr'))

  const shown = sel === 'all' ? groups : groups.filter((g) => g.apiId === sel)
  const multi = groups.length > 1

  return (
    <div>
      {multi && (
        <div className="flex flex-wrap gap-2">
          <Chip active={sel === 'all'} onClick={() => setSel('all')}>
            <LiveDot />
            Tümü
            <Count n={fixtures.length} active={sel === 'all'} />
          </Chip>
          {groups.map((g) => (
            <Chip key={g.apiId} active={sel === g.apiId} onClick={() => setSel(g.apiId)}>
              <TeamLogo apiId={g.apiId} kind="league" size={14} />
              <span className="max-w-[10rem] truncate">{g.name}</span>
              <Count n={g.fixtures.length} active={sel === g.apiId} />
            </Chip>
          ))}
        </div>
      )}

      <div className={cn('space-y-5', multi && 'mt-4')}>
        {shown.map((g) => (
          <div key={g.apiId}>
            {sel === 'all' && multi && (
              <div className="mb-2 flex items-center gap-2">
                <TeamLogo apiId={g.apiId} kind="league" size={18} />
                <span className="section-label text-ink-200">{g.name}</span>
                <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-bold text-ink-300">
                  {g.fixtures.length}
                </span>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {g.fixtures.map((f) => (
                <LiveMatchCard key={f.id} fixture={f} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-transparent bg-brand-500 text-ink-950'
          : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600 hover:text-ink-100',
      )}
    >
      {children}
    </button>
  )
}

function Count({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 text-[11px] font-bold tabular-nums',
        active ? 'bg-ink-950/15 text-ink-950' : 'bg-ink-800 text-ink-400',
      )}
    >
      {n}
    </span>
  )
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
    </span>
  )
}
