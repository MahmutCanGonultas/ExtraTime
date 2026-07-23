import { Link } from 'react-router-dom'
import { TeamLogo } from '@/components/TeamLogo'
import { Badge } from '@/components/ui/Badge'
import { formatDate, liveMinuteLabel } from '@/lib/format'
import { isCancelled, isFinished, isLive, isPostponed } from './matchStatus'
import { cn } from '@/lib/cn'
import type { Fixture } from './types'

function kickoffTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
function shortDate(iso: string): string {
  return formatDate(iso).replace(/\s\d{4}$/, '') // drop the year for compactness
}
const shortLeague = (name: string) => name.replace(/^UEFA\s+/i, '')

function TeamLine({ team, score, dim, win }: { team: Fixture['home']; score: number | null; dim: boolean; win: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogo apiId={team.apiFootballId} size={20} />
      <span className={cn('flex-1 truncate text-sm', dim ? 'text-ink-400' : win ? 'font-semibold text-ink-50' : 'text-ink-100')}>
        {team.name}
      </span>
      {score !== null && (
        <span className={cn('score-num shrink-0 font-bold tabular-nums', win ? 'text-brand-300' : 'text-ink-100')}>{score}</span>
      )}
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
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 shadow-sm transition',
        'hover:-translate-y-px hover:shadow-md',
        live
          ? 'border-loss/40 bg-gradient-to-r from-loss/[0.12] to-loss/[0.03] hover:border-loss/60'
          : isGroup
            ? 'border-brand-500/40 bg-gradient-to-r from-brand-500/[0.13] to-brand-500/[0.03] hover:border-brand-500/60'
            : 'border-ink-800 bg-gradient-to-r from-ink-850 to-ink-850/50 hover:border-ink-700 hover:from-ink-800',
      )}
    >
      {/* left accent stripe */}
      <span className={cn('absolute inset-y-0 left-0 w-1', live ? 'bg-loss' : isGroup ? 'bg-brand-500' : 'bg-ink-700 group-hover:bg-ink-600')} />

      <div className="min-w-0 flex-1 space-y-1.5 pl-1">
        {(showLeague || isGroup) && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
            {isGroup && (
              <span className="rounded bg-brand-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-brand-100">
                Grup
              </span>
            )}
            {showLeague && (
              <>
                <span className="flex h-4 items-center rounded-[3px] bg-white/90 px-0.5">
                  <TeamLogo apiId={fixture.leagueApiId} kind="league" size={12} />
                </span>
                <span className="truncate">{shortLeague(fixture.leagueName)}</span>
              </>
            )}
          </div>
        )}
        <TeamLine team={fixture.home} score={showScore ? fixture.homeScore : null} dim={awayWon} win={homeWon} />
        <TeamLine team={fixture.away} score={showScore ? fixture.awayScore : null} dim={homeWon} win={awayWon} />
      </div>

      {/* right: time / live / status */}
      <div className="shrink-0">
        {live ? (
          <Badge tone="loss">{liveMinuteLabel(fixture.status, fixture.elapsed)}</Badge>
        ) : isPostponed(fixture.status) ? (
          <Badge tone="warning">Ertelendi</Badge>
        ) : isCancelled(fixture.status) ? (
          <Badge tone="loss">İptal</Badge>
        ) : finished ? (
          <div className="rounded-lg bg-ink-800/70 px-2.5 py-1 text-center ring-1 ring-ink-700/60">
            <div className="text-[10px] font-medium text-ink-400">{shortDate(fixture.kickoffAt)}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Bitti</div>
          </div>
        ) : (
          <div className="rounded-lg bg-ink-800 px-2.5 py-1 text-center ring-1 ring-ink-700">
            <div className="font-display text-sm font-bold leading-tight text-ink-50">{kickoffTime(fixture.kickoffAt)}</div>
            <div className="text-[10px] text-ink-400">{shortDate(fixture.kickoffAt)}</div>
          </div>
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
    <div className="space-y-2 p-2.5 sm:p-3">
      {fixtures.map((f) => (
        <FixtureRow key={f.id} fixture={f} showLeague={showLeague} isGroup={groupIds?.has(f.id)} />
      ))}
    </div>
  )
}
