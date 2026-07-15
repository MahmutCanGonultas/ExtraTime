import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import type { Fixture } from './types'

export function LiveMatchCard({ fixture }: { fixture: Fixture }) {
  return (
    <Link
      to={`/matches/${fixture.id}`}
      className="block rounded-card border border-loss/30 bg-loss/5 p-4 transition hover:border-loss/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="truncate text-xs text-ink-400">{fixture.round ?? ''}</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-loss">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
          </span>
          CANLI
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <TeamLogo apiId={fixture.home.apiFootballId} size={38} />
          <span className="truncate text-center text-sm text-ink-100">{fixture.home.name}</span>
        </div>
        <div className="shrink-0 text-2xl font-bold tabular-nums text-ink-100">
          {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <TeamLogo apiId={fixture.away.apiFootballId} size={38} />
          <span className="truncate text-center text-sm text-ink-100">{fixture.away.name}</span>
        </div>
      </div>
    </Link>
  )
}
