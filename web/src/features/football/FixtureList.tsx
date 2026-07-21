import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, liveMinuteLabel } from '@/lib/format'
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

export function FixtureRow({
  fixture,
  showLeague,
  isGroup,
}: {
  fixture: Fixture
  showLeague?: boolean
  isGroup?: boolean
}) {
  const finished = isFinished(fixture.status)
  const live = isLive(fixture.status)
  const showScore = finished || live
  const homeWon = finished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0)
  const awayWon = finished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0)

  return (
    <Link
      to={`/matches/${fixture.id}`}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-ink-850 ${isGroup ? 'bg-brand-500/6' : ''}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {(showLeague || isGroup) && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
            {isGroup && (
              <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-brand-200">
                Grup
              </span>
            )}
            {showLeague && (
              <>
                <TeamLogo apiId={fixture.leagueApiId} kind="league" size={12} />
                <span className="truncate">{fixture.leagueName}</span>
              </>
            )}
          </div>
        )}
        <TeamLine team={fixture.home} score={showScore ? fixture.homeScore : null} dim={awayWon} />
        <TeamLine team={fixture.away} score={showScore ? fixture.awayScore : null} dim={homeWon} />
      </div>
      <div className="w-24 shrink-0 text-right text-xs text-ink-400">
        {finished ? (
          <span title="Oynandı">{formatDate(fixture.kickoffAt)}</span>
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

export function FixtureList({
  fixtures,
  showLeague,
  groupIds,
}: {
  fixtures: Fixture[]
  showLeague?: boolean
  groupIds?: Set<number>
}) {
  return (
    <div className="divide-y divide-ink-850">
      {fixtures.map((f) => (
        <FixtureRow key={f.id} fixture={f} showLeague={showLeague} isGroup={groupIds?.has(f.id)} />
      ))}
    </div>
  )
}
