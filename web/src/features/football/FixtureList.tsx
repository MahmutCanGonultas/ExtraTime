import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, liveMinuteLabel } from '@/lib/format'
import { isCancelled, isFinished, isLive, isPostponed } from './matchStatus'
import type { Fixture } from './types'

function TeamLine({ team, score, dim }: { team: Fixture['home']; score: number | null; dim: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogo apiId={team.apiFootballId} size={18} />
      <span className={`flex-1 truncate text-sm ${dim ? 'text-ink-400' : 'text-ink-100'}`}>
        {team.name}
      </span>
      {score !== null && <span className="font-bold tabular-nums text-ink-100">{score}</span>}
    </div>
  )
}

export function FixtureRow({ fixture }: { fixture: Fixture }) {
  const finished = isFinished(fixture.status)
  const live = isLive(fixture.status)
  const showScore = finished || live
  const homeWon = finished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0)
  const awayWon = finished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0)

  return (
    <Link
      to={`/matches/${fixture.id}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-ink-850"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <TeamLine team={fixture.home} score={showScore ? fixture.homeScore : null} dim={awayWon} />
        <TeamLine team={fixture.away} score={showScore ? fixture.awayScore : null} dim={homeWon} />
      </div>
      <div className="w-24 shrink-0 text-right text-xs text-ink-400">
        {finished ? (
          <Badge tone="neutral">Bitti</Badge>
        ) : isLive(fixture.status) ? (
          <Badge tone="loss">{liveMinuteLabel(fixture.status, fixture.elapsed)}</Badge>
        ) : isPostponed(fixture.status) ? (
          <Badge tone="warning">Ertelendi</Badge>
        ) : isCancelled(fixture.status) ? (
          <Badge tone="loss">İptal</Badge>
        ) : (
          formatDateTime(fixture.kickoffAt)
        )}
      </div>
    </Link>
  )
}

export function FixtureList({ fixtures }: { fixtures: Fixture[] }) {
  return (
    <div className="divide-y divide-ink-850">
      {fixtures.map((f) => (
        <FixtureRow key={f.id} fixture={f} />
      ))}
    </div>
  )
}
