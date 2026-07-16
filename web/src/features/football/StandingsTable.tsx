import { Link } from 'react-router-dom'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { TeamLogo } from '@/components/TeamLogo'
import { FormBadges } from './FormBadges'
import type { StandingRow } from './types'

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
          </div>
        ))}
      </div>
    )
  }
  return <StandingsTableInner rows={rows} compact={compact} />
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
          return (
            <Tr key={row.teamId}>
              <Td className="text-ink-400">{row.position}</Td>
              <Td>
                <Link
                  to={`/teams/${row.teamId}`}
                  className="flex items-center gap-2 hover:text-brand-300"
                >
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
