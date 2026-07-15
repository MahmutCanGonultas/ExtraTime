import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import { GoalList } from './GoalList'
import { liveMinuteLabel } from '@/lib/format'
import type { Fixture } from './types'

export function LiveMatchCard({ fixture }: { fixture: Fixture }) {
  const goals = fixture.goals ?? []
  return (
    <Link
      to={`/matches/${fixture.id}`}
      className="block overflow-hidden rounded-card border border-loss/25 bg-loss/[0.06] transition hover:border-loss/50"
    >
      <div className="flex items-center justify-between border-b border-loss/15 px-3.5 py-2">
        <span className="truncate text-[11px] font-medium text-ink-400">{fixture.leagueName}</span>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-loss">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
          </span>
          {liveMinuteLabel(fixture.status, fixture.elapsed)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <TeamLogo apiId={fixture.home.apiFootballId} size={40} />
          <span className="truncate text-center text-sm font-medium text-ink-100">
            {fixture.home.name}
          </span>
        </div>
        <div className="shrink-0 px-1 text-3xl font-extrabold tabular-nums text-ink-100">
          {fixture.homeScore ?? 0}
          <span className="mx-1 text-ink-600">:</span>
          {fixture.awayScore ?? 0}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <TeamLogo apiId={fixture.away.apiFootballId} size={40} />
          <span className="truncate text-center text-sm font-medium text-ink-100">
            {fixture.away.name}
          </span>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="border-t border-loss/15 px-4 py-2">
          <GoalList goals={goals} max={5} />
        </div>
      )}
    </Link>
  )
}
