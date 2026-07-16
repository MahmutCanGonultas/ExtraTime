import { Link } from 'react-router-dom'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { TeamLogo } from '@/components/TeamLogo'
import { FormBadges } from './FormBadges'
import { cn } from '@/lib/cn'
import type { StandingRow } from './types'

interface Zone {
  key: string
  border: string
  dot: string
  label: string
}

// Maps the API's qualification/relegation "description" to a coloured zone. Covers
// the Champions League Swiss league phase (top 8 -> Round of 16, 9-24 -> play-off,
// 25-36 -> out) and domestic promotion / European spots / relegation.
function standingZone(desc: string | null): Zone | null {
  if (!desc) return null
  const d = desc.toLowerCase()
  if (d.includes('relegation')) return { key: 'releg', border: 'border-l-loss', dot: 'bg-loss', label: 'Küme düşme' }
  if (d.includes('1/8-finals') || d.includes('round of 16'))
    return { key: 'r16', border: 'border-l-brand-500', dot: 'bg-brand-400', label: 'Son 16' }
  if (d.includes('1/16-finals') || d.includes('play-off') || d.includes('play off') || d.includes('knockout'))
    return { key: 'playoff', border: 'border-l-amber-500', dot: 'bg-amber-400', label: 'Play-off' }
  if (d.includes('champions league'))
    return { key: 'cl', border: 'border-l-brand-500', dot: 'bg-brand-400', label: 'Şampiyonlar Ligi' }
  if (d.includes('europa')) return { key: 'el', border: 'border-l-sky-500', dot: 'bg-sky-400', label: 'Avrupa Ligi' }
  if (d.includes('conference'))
    return { key: 'conf', border: 'border-l-violet-500', dot: 'bg-violet-400', label: 'Konferans Ligi' }
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

function StandingsTableInner({ rows, compact }: { rows: StandingRow[]; compact: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-8">#</Th>
          <Th>Takım</Th>
          <Th className="text-center">O</Th>
          {!compact && (
            <>
              <Th className="hidden text-center sm:table-cell">G</Th>
              <Th className="hidden text-center sm:table-cell">B</Th>
              <Th className="hidden text-center sm:table-cell">M</Th>
            </>
          )}
          <Th className="text-center">AV</Th>
          {!compact && <Th className="hidden text-center md:table-cell">Form</Th>}
          <Th className="text-center">P</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const diff = row.goalsFor - row.goalsAgainst
          const zone = standingZone(row.description)
          return (
            <Tr key={row.teamId}>
              <Td className={cn('border-l-2 text-ink-400', zone ? zone.border : 'border-l-transparent')}>
                {row.position}
              </Td>
              <Td>
                <Link to={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-brand-300">
                  <TeamLogo apiId={row.teamApiId} size={20} />
                  <span className="truncate">{row.teamName}</span>
                </Link>
              </Td>
              <Td className="text-center">{row.played}</Td>
              {!compact && (
                <>
                  <Td className="hidden text-center sm:table-cell">{row.won}</Td>
                  <Td className="hidden text-center sm:table-cell">{row.drawn}</Td>
                  <Td className="hidden text-center sm:table-cell">{row.lost}</Td>
                </>
              )}
              <Td className="text-center text-ink-400">{diff > 0 ? `+${diff}` : diff}</Td>
              {!compact && (
                <Td className="hidden text-center md:table-cell">
                  <FormBadges form={row.form} />
                </Td>
              )}
              <Td className="text-center font-bold text-ink-100">{row.points}</Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
