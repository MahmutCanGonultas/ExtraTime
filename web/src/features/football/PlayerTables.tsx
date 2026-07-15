import { Link } from 'react-router-dom'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { TeamLogo } from '@/components/TeamLogo'
import type { TopAssist, TopScorer } from './types'

function PlayerName({
  name,
  teamId,
  teamApiId,
  teamName,
}: {
  name: string
  teamId: number | null
  teamApiId: number | null
  teamName: string | null
}) {
  return (
    <div className="flex items-center gap-2">
      {teamApiId !== null && <TeamLogo apiId={teamApiId} size={18} />}
      <div className="min-w-0">
        <div className="truncate text-ink-100">{name}</div>
        {teamName && (
          <Link
            to={teamId ? `/teams/${teamId}` : '#'}
            className="truncate text-xs text-ink-400 hover:text-brand-300"
          >
            {teamName}
          </Link>
        )}
      </div>
    </div>
  )
}

export function ScorersTable({ rows }: { rows: TopScorer[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-8">#</Th>
          <Th>Oyuncu</Th>
          <Th className="hidden text-center sm:table-cell">Maç</Th>
          <Th className="hidden text-center sm:table-cell">Pen.</Th>
          <Th className="text-center">Gol</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.rank}>
            <Td className="text-ink-400">{r.rank}</Td>
            <Td>
              <PlayerName name={r.playerName} teamId={r.teamId} teamApiId={r.teamApiId} teamName={r.teamName} />
            </Td>
            <Td className="hidden text-center text-ink-400 sm:table-cell">{r.appearances ?? '—'}</Td>
            <Td className="hidden text-center text-ink-400 sm:table-cell">{r.penalties ?? '—'}</Td>
            <Td className="text-center font-bold text-ink-100">{r.goals}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

export function AssistsTable({ rows }: { rows: TopAssist[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-8">#</Th>
          <Th>Oyuncu</Th>
          <Th className="hidden text-center sm:table-cell">Maç</Th>
          <Th className="text-center">Asist</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.rank}>
            <Td className="text-ink-400">{r.rank}</Td>
            <Td>
              <PlayerName name={r.playerName} teamId={r.teamId} teamApiId={r.teamApiId} teamName={r.teamName} />
            </Td>
            <Td className="hidden text-center text-ink-400 sm:table-cell">{r.appearances ?? '—'}</Td>
            <Td className="text-center font-bold text-ink-100">{r.assists}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}
