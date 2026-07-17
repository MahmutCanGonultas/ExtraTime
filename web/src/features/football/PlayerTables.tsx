import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { cn } from '@/lib/cn'
import type { TopAssist, TopScorer } from './types'

function PlayerName({
  name,
  playerApiId,
  teamId,
  teamApiId,
  teamName,
}: {
  name: string
  playerApiId: number | null
  teamId: number | null
  teamApiId: number | null
  teamName: string | null
}) {
  return (
    <div className="flex items-center gap-3">
      <PlayerAvatar playerApiId={playerApiId} name={name} size={40} />
      <div className="min-w-0">
        {playerApiId != null ? (
          <Link
            to={`/players/${playerApiId}`}
            className="block truncate text-[15px] font-semibold text-ink-100 hover:text-brand-300"
          >
            {name}
          </Link>
        ) : (
          <div className="truncate text-[15px] font-semibold text-ink-100">{name}</div>
        )}
        {teamName && (
          <Link
            to={teamId ? `/teams/${teamId}` : '#'}
            className="flex items-center gap-1 truncate text-xs text-ink-400 hover:text-brand-300"
          >
            {teamApiId !== null && <TeamLogo apiId={teamApiId} size={14} />}
            {teamName}
          </Link>
        )}
      </div>
    </div>
  )
}

// Podium medal for the top three, plain number otherwise.
function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 ring-amber-200/60'
      : rank === 2
        ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 ring-slate-200/50'
        : rank === 3
          ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950 ring-orange-300/50'
          : null
  if (medal) {
    return (
      <span
        className={cn(
          'inline-grid h-8 w-8 place-items-center rounded-full text-sm font-black shadow ring-2',
          medal,
        )}
      >
        {rank}
      </span>
    )
  }
  return (
    <span className="inline-grid h-8 w-8 place-items-center text-sm font-bold text-ink-400">
      {rank}
    </span>
  )
}

// Faint podium tint so the top three read as a group without shouting.
function podiumRow(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-amber-400/[0.08] to-transparent'
  if (rank === 2) return 'bg-gradient-to-r from-slate-300/[0.06] to-transparent'
  if (rank === 3) return 'bg-gradient-to-r from-orange-400/[0.06] to-transparent'
  return ''
}

function StatPill({ value, top }: { value: number; top: boolean }) {
  return (
    <span
      className={cn(
        'inline-grid h-8 min-w-[38px] place-items-center rounded-lg px-2 text-base font-extrabold tabular-nums',
        top
          ? 'bg-brand-500 text-ink-950 shadow-sm shadow-brand-950/30'
          : 'bg-ink-800/80 text-ink-50 ring-1 ring-ink-700/60',
      )}
    >
      {value}
    </span>
  )
}

function LeaderTable({
  rows,
  statLabel,
  extraCols,
}: {
  rows: Array<{
    rank: number
    playerName: string
    playerApiId: number | null
    teamId: number | null
    teamApiId: number | null
    teamName: string | null
    stat: number
    cells: (string | number)[]
  }>
  statLabel: string
  extraCols: string[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            <th className="w-12 py-3 pl-3 pr-1 text-left">#</th>
            <th className="py-3 pl-1 pr-3 text-left">Oyuncu</th>
            {extraCols.map((c) => (
              <th key={c} className="hidden px-2 py-3 text-center sm:table-cell">
                {c}
              </th>
            ))}
            <th className="px-3 py-3 text-center">{statLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const top = r.rank <= 3
            return (
              <tr
                key={r.rank}
                className={cn(
                  'group border-b border-ink-850/40 transition-colors last:border-0 hover:bg-ink-800/40',
                  podiumRow(r.rank),
                )}
              >
                <td className="py-3 pl-3 pr-1">
                  <RankBadge rank={r.rank} />
                </td>
                <td className="py-3 pl-1 pr-3">
                  <PlayerName
                    name={r.playerName}
                    playerApiId={r.playerApiId}
                    teamId={r.teamId}
                    teamApiId={r.teamApiId}
                    teamName={r.teamName}
                  />
                </td>
                {r.cells.map((c, i) => (
                  <td key={i} className="hidden px-2 py-3 text-center text-ink-400 sm:table-cell">
                    {c}
                  </td>
                ))}
                <td className="px-3 py-3 text-center">
                  <StatPill value={r.stat} top={top} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ScorersTable({ rows }: { rows: TopScorer[] }) {
  return (
    <LeaderTable
      statLabel="Gol"
      extraCols={['Maç', 'Pen.']}
      rows={rows.map((r) => ({
        rank: r.rank,
        playerName: r.playerName,
        playerApiId: r.playerApiId,
        teamId: r.teamId,
        teamApiId: r.teamApiId,
        teamName: r.teamName,
        stat: r.goals,
        cells: [r.appearances ?? '—', r.penalties ?? '—'],
      }))}
    />
  )
}

export function AssistsTable({ rows }: { rows: TopAssist[] }) {
  return (
    <LeaderTable
      statLabel="Asist"
      extraCols={['Maç']}
      rows={rows.map((r) => ({
        rank: r.rank,
        playerName: r.playerName,
        playerApiId: r.playerApiId,
        teamId: r.teamId,
        teamApiId: r.teamApiId,
        teamName: r.teamName,
        stat: r.assists,
        cells: [r.appearances ?? '—'],
      }))}
    />
  )
}
