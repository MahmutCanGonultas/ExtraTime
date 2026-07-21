import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import { FormBadges } from './FormBadges'
import { cn } from '@/lib/cn'
import type { StandingRow } from './types'

interface Zone {
  key: string
  border: string
  dot: string
  row: string
  label: string
}

// Maps the API's qualification/relegation "description" to a coloured zone. Covers
// the Champions League Swiss league phase (top 8 -> Round of 16, 9-24 -> play-off,
// 25-36 -> out) and domestic promotion / European spots / relegation. `row` is a
// faint full-row wash so the table reads in colour bands, not one dark block.
function standingZone(desc: string | null): Zone | null {
  if (!desc) return null
  const d = desc.toLowerCase()
  if (d.includes('relegation'))
    return { key: 'releg', border: 'border-l-loss', dot: 'bg-loss', row: 'bg-loss/6', label: 'Küme düşme' }
  if (d.includes('1/8-finals') || d.includes('round of 16'))
    return { key: 'r16', border: 'border-l-brand-500', dot: 'bg-brand-400', row: 'bg-brand-500/6', label: 'Son 16' }
  if (d.includes('1/16-finals') || d.includes('play-off') || d.includes('play off') || d.includes('knockout'))
    return { key: 'playoff', border: 'border-l-amber-500', dot: 'bg-amber-400', row: 'bg-amber-500/6', label: 'Play-off' }
  if (d.includes('champions league'))
    return { key: 'cl', border: 'border-l-brand-500', dot: 'bg-brand-400', row: 'bg-brand-500/6', label: 'Şampiyonlar Ligi' }
  if (d.includes('europa'))
    return { key: 'el', border: 'border-l-sky-500', dot: 'bg-sky-400', row: 'bg-sky-500/6', label: 'Avrupa Ligi' }
  if (d.includes('conference'))
    return { key: 'conf', border: 'border-l-violet-500', dot: 'bg-violet-400', row: 'bg-violet-500/6', label: 'Konferans Ligi' }
  return null
}

function ZoneLegend({ rows }: { rows: StandingRow[] }) {
  const seen = new Map<string, Zone>()
  for (const r of rows) {
    const z = standingZone(r.description)
    if (z && !seen.has(z.key)) seen.set(z.key, z)
  }
  if (seen.size === 0) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 py-2 text-[11px] text-ink-400">
      {[...seen.values()].map((z) => (
        <span key={z.key} className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-sm', z.dot)} />
          {z.label}
        </span>
      ))}
    </div>
  )
}

export function StandingsTable({ rows, compact = false }: { rows: StandingRow[]; compact?: boolean }) {
  // Tournament standings (World Cup, etc.) arrive split into groups. When there
  // is more than one distinct group, render a labelled mini-table per group.
  const groups = new Map<string, StandingRow[]>()
  for (const r of rows) {
    const key = r.groupLabel ?? ''
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }
  if (groups.size > 1) {
    return (
      <div className="space-y-4 p-1">
        {[...groups.entries()].map(([label, groupRows]) => (
          <div key={label}>
            <div className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
              {label || 'Grup'}
            </div>
            <StandingsTableInner rows={groupRows} compact={compact} />
            <ZoneLegend rows={groupRows} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <>
      <StandingsTableInner rows={rows} compact={compact} />
      <ZoneLegend rows={rows} />
    </>
  )
}

// Rank chip: podium colours for the top three, plain otherwise.
function rankChip(rank: number): string {
  if (rank === 1) return 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25'
  if (rank === 2) return 'bg-slate-300/15 text-slate-200 ring-1 ring-slate-300/20'
  if (rank === 3) return 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25'
  return 'text-ink-400'
}

function StandingsTableInner({ rows, compact }: { rows: StandingRow[]; compact: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="border-b border-ink-800 bg-ink-900/70 text-[11px] font-bold uppercase tracking-wider text-ink-400">
            <th className="py-3 pl-3 pr-1 text-left">#</th>
            <th className="py-3 pl-1 pr-3 text-left">Takım</th>
            <th className="px-2 py-3 text-center">O</th>
            {!compact && (
              <>
                <th className="hidden px-2 py-3 text-center sm:table-cell">G</th>
                <th className="hidden px-2 py-3 text-center sm:table-cell">B</th>
                <th className="hidden px-2 py-3 text-center sm:table-cell">M</th>
              </>
            )}
            <th className="px-2 py-3 text-center">AV</th>
            {!compact && <th className="hidden px-3 py-3 text-center md:table-cell">Form</th>}
            <th className="px-3 py-3 text-center">P</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff = row.goalsFor - row.goalsAgainst
            const zone = standingZone(row.description)
            return (
              <tr
                key={row.teamId}
                className={cn(
                  'group border-b border-ink-850/40 transition-colors last:border-0 hover:bg-ink-800/50',
                  zone ? zone.row : 'even:bg-ink-900/30',
                )}
              >
                <td
                  className={cn(
                    'border-l-[3px] py-3 pl-2 pr-1',
                    zone ? zone.border : 'border-l-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'inline-grid h-6 min-w-[24px] place-items-center rounded-md px-1 text-[13px] font-bold',
                      rankChip(row.position),
                    )}
                  >
                    {row.position}
                  </span>
                </td>
                <td className="py-3 pl-1 pr-3">
                  <Link
                    to={`/teams/${row.teamId}`}
                    className="flex items-center gap-2.5 group-hover:text-brand-300"
                  >
                    <TeamLogo apiId={row.teamApiId} size={26} />
                    <span className="truncate font-semibold text-ink-100">{row.teamName}</span>
                  </Link>
                </td>
                <td className="px-2 py-3 text-center text-ink-300">{row.played}</td>
                {!compact && (
                  <>
                    <td className="hidden px-2 py-3 text-center text-ink-300 sm:table-cell">{row.won}</td>
                    <td className="hidden px-2 py-3 text-center text-ink-400 sm:table-cell">{row.drawn}</td>
                    <td className="hidden px-2 py-3 text-center text-ink-400 sm:table-cell">{row.lost}</td>
                  </>
                )}
                <td
                  className={cn(
                    'px-2 py-3 text-center font-medium',
                    diff > 0 ? 'text-win' : diff < 0 ? 'text-loss' : 'text-ink-500',
                  )}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </td>
                {!compact && (
                  <td className="hidden px-3 py-3 md:table-cell">
                    <div className="flex justify-center">
                      <FormBadges form={row.form} />
                    </div>
                  </td>
                )}
                <td className="px-3 py-3 text-center">
                  <span className="inline-grid h-7 min-w-[32px] place-items-center rounded-lg bg-ink-800/80 px-1.5 text-[15px] font-extrabold text-ink-50 ring-1 ring-ink-700/60 transition group-hover:ring-brand-500/40">
                    {row.points}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
