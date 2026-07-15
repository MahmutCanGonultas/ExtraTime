import { Table, Th, Td, Tr } from '@/components/ui/Table'
import type { LeaderboardEntry } from './types'

function pct(value: number | null): string {
  return value === null ? '—' : `%${Math.round(value * 100)}`
}

export function Leaderboard({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[]
  currentUserId?: number
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-8">#</Th>
          <Th>Üye</Th>
          <Th className="text-center">Puan</Th>
          <Th className="hidden text-center sm:table-cell">Tam</Th>
          <Th className="hidden text-center sm:table-cell">Tahmin</Th>
          <Th className="text-center">İsabet</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <Tr key={e.userId} className={e.userId === currentUserId ? 'bg-brand-500/5' : undefined}>
            <Td className="text-ink-400">{i + 1}</Td>
            <Td className="font-medium text-ink-100">
              {e.displayName}
              {e.userId === currentUserId && <span className="ml-1 text-xs text-brand-300">(sen)</span>}
            </Td>
            <Td className="text-center font-bold text-ink-100">{e.points}</Td>
            <Td className="hidden text-center text-ink-300 sm:table-cell">{e.exactCount}</Td>
            <Td className="hidden text-center text-ink-300 sm:table-cell">{e.settledCount}</Td>
            <Td className="text-center text-ink-300">{pct(e.accuracy)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}
