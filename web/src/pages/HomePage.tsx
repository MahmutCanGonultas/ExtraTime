import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Crown, ListChecks, Trophy, CalendarClock, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useLeagues } from '@/features/football/hooks'
import type { Fixture, League } from '@/features/football/types'
import { useStandings, useTopScorers } from '@/features/football/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useLeaderboard, useMyPredictions } from '@/features/groups/hooks'
import { useAuth } from '@/features/auth/AuthContext'
import { TeamLogo } from '@/components/TeamLogo'
import { StatTile } from '@/components/ui/StatTile'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'

function seasonLabel(season?: number): string {
  if (!season) return ''
  return `${season}/${((season + 1) % 100).toString().padStart(2, '0')}`
}

export function HomePage() {
  const { user } = useAuth()
  const { active } = useActiveGroup()
  const leaguesQ = useLeagues(true)
  const leagues = leaguesQ.data ?? []
  const [filter, setFilter] = useState<number | 'all'>('all')

  const finishedQ = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['fixtures', l.id, 'finished'],
      queryFn: () => api.get<{ fixtures: Fixture[] }>(`/leagues/${l.id}/fixtures?status=finished`),
    })),
  })
  const upcomingQ = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['fixtures', l.id, 'upcoming'],
      queryFn: () => api.get<{ fixtures: Fixture[] }>(`/leagues/${l.id}/fixtures?status=upcoming`),
    })),
  })

  const leaderboard = useLeaderboard(active?.id ?? 0)
  const myPreds = useMyPredictions(active?.id ?? 0)

  const recentResults = finishedQ
    .flatMap((q) => q.data?.fixtures ?? [])
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .slice(0, 12)

  const upcoming = upcomingQ.flatMap((q) => q.data?.fixtures ?? [])
  const predictedIds = new Set(myPreds.data?.map((p) => p.fixtureId))
  const toPredict = upcoming.filter((f) => !predictedIds.has(f.id)).length

  const myEntry = leaderboard.data?.find((e) => e.userId === user?.id)
  const myRank = myEntry ? (leaderboard.data?.indexOf(myEntry) ?? 0) + 1 : null

  const visibleLeagues = filter === 'all' ? leagues : leagues.filter((l) => l.id === filter)
  const season = leagues[0]?.season

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-card border border-ink-800 bg-gradient-to-br from-ink-850 to-ink-900 px-5 py-6">
        <h1 className="text-2xl font-bold text-ink-100 sm:text-3xl">
          Merhaba, <span className="text-brand-400">{user?.displayName ?? 'oyuncu'}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          {season ? `${seasonLabel(season)} sezonu` : 'Futbol tahmin ligin'}
          {active ? ` · ${active.name}` : ''}
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {active ? (
          <>
            <StatTile
              icon={<Crown className="h-5 w-5" />}
              accent="amber"
              label="Grup sıran"
              value={myRank ? `${myRank}.` : '—'}
            />
            <StatTile
              icon={<Trophy className="h-5 w-5" />}
              accent="brand"
              label="Puanın"
              value={myEntry?.points ?? 0}
            />
            <StatTile
              icon={<ListChecks className="h-5 w-5" />}
              accent="sky"
              label="Girilecek tahmin"
              value={toPredict}
            />
            <StatTile
              icon={<CalendarClock className="h-5 w-5" />}
              accent="neutral"
              label="Yaklaşan maç"
              value={upcoming.length}
            />
          </>
        ) : (
          <Link
            to="/group"
            className="col-span-2 flex items-center justify-between rounded-card border border-brand-500/30 bg-brand-500/10 px-4 py-3 transition hover:bg-brand-500/15 lg:col-span-4"
          >
            <div>
              <div className="font-semibold text-brand-300">Bir gruba katıl</div>
              <div className="text-xs text-ink-400">Tahmin oynamak için bir grup kur ya da katıl.</div>
            </div>
            <ArrowRight className="h-5 w-5 text-brand-300" />
          </Link>
        )}
      </div>

      {/* Recent results strip */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Son Sonuçlar
        </h2>
        {leaguesQ.isLoading || finishedQ.some((q) => q.isLoading) ? (
          <div className="flex gap-3">
            <Skeleton className="h-24 w-56" />
            <Skeleton className="h-24 w-56" />
            <Skeleton className="h-24 w-56" />
          </div>
        ) : recentResults.length === 0 ? (
          <Card>
            <EmptyState title="Sonuç yok" />
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentResults.map((f) => (
              <ResultCard key={f.id} fixture={f} />
            ))}
          </div>
        )}
      </section>

      {/* League filter */}
      {leagues.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Tümü
          </FilterChip>
          {leagues.map((l) => (
            <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)}>
              {l.name}
            </FilterChip>
          ))}
        </div>
      )}

      {/* League blocks */}
      {leaguesQ.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : !leagues.length ? (
        <EmptyState title="Henüz veri yok" description="Ligler senkronize edildiğinde burada görünecek." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleLeagues.map((l) => (
            <LeagueBlock key={l.id} league={l} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-brand-500 text-ink-950' : 'bg-ink-800 text-ink-300 hover:bg-ink-750'
      }`}
    >
      {children}
    </button>
  )
}

function ResultCard({ fixture }: { fixture: Fixture }) {
  return (
    <Link
      to={`/matches/${fixture.id}`}
      className="w-56 shrink-0 rounded-card border border-ink-800 bg-ink-900 p-3 transition hover:border-ink-700"
    >
      <div className="mb-2 text-[11px] text-ink-500">{formatDate(fixture.kickoffAt)}</div>
      <Row team={fixture.home} score={fixture.homeScore} win={(fixture.homeScore ?? 0) > (fixture.awayScore ?? 0)} />
      <Row team={fixture.away} score={fixture.awayScore} win={(fixture.awayScore ?? 0) > (fixture.homeScore ?? 0)} />
    </Link>
  )
}

function Row({ team, score, win }: { team: Fixture['home']; score: number | null; win: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <TeamLogo apiId={team.apiFootballId} size={18} />
      <span className={`flex-1 truncate text-sm ${win ? 'font-semibold text-ink-100' : 'text-ink-300'}`}>
        {team.name}
      </span>
      <span className={`text-sm tabular-nums ${win ? 'font-bold text-ink-100' : 'text-ink-400'}`}>
        {score ?? '-'}
      </span>
    </div>
  )
}

function LeagueBlock({ league }: { league: League }) {
  const standings = useStandings(league.id)
  const scorers = useTopScorers(league.id)
  const leader = scorers.data?.[0]
  const top5 = standings.data?.slice(0, 5) ?? []

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <TeamLogo apiId={league.apiFootballId} kind="league" size={24} />
            {league.name}
          </span>
        }
        action={
          <Link to={`/leagues/${league.id}`} className="text-xs text-brand-300 hover:underline">
            Detay →
          </Link>
        }
      />
      <CardBody className="space-y-3">
        {standings.isLoading ? (
          <Skeleton className="h-40" />
        ) : top5.length ? (
          <div className="space-y-1">
            {top5.map((row, i) => (
              <Link
                key={row.teamId}
                to={`/teams/${row.teamId}`}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition hover:bg-ink-850"
              >
                <span className={`w-5 text-center text-xs ${i === 0 ? 'text-brand-400' : 'text-ink-500'}`}>
                  {row.position}
                </span>
                <TeamLogo apiId={row.teamApiId} size={20} />
                <span className="flex-1 truncate text-ink-200">{row.teamName}</span>
                <span className="text-xs text-ink-500">{row.played} maç</span>
                <span className="w-7 text-right font-bold text-ink-100">{row.points}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-2 py-1 text-sm text-ink-500">Veri yok</p>
        )}

        {leader && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <Crown className="h-5 w-5 shrink-0 text-amber-300" />
            {leader.teamApiId !== null && <TeamLogo apiId={leader.teamApiId} size={22} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink-100">{leader.playerName}</div>
              <div className="text-[11px] text-ink-400">Gol Kralı</div>
            </div>
            <div className="text-lg font-bold text-amber-300">{leader.goals}</div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
