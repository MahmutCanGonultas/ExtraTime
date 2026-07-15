import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Crown, ArrowRight, Trophy } from 'lucide-react'
import {
  useLeagues,
  useLiveFixtures,
  useRecentFixtures,
  useStandings,
  useTopScorers,
  useUpcomingFixtures,
} from '@/features/football/hooks'
import type { Fixture, League } from '@/features/football/types'
import { LiveMatchCard } from '@/features/football/LiveMatchCard'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useGroupFixtures, useLeaderboard } from '@/features/groups/hooks'
import { useAuth } from '@/features/auth/AuthContext'
import { TeamLogo } from '@/components/TeamLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { BallMark } from '@/components/Brand'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { formatDate, formatTime, formatDateTime } from '@/lib/format'

export function HomePage() {
  const { user } = useAuth()
  const { active } = useActiveGroup()
  const groupId = active?.id ?? 0
  const leaguesQ = useLeagues(true)
  const leagues = leaguesQ.data ?? []
  const [filter, setFilter] = useState<number | 'all'>('all')

  const live = useLiveFixtures()
  const upcoming = useUpcomingFixtures(10)
  const recent = useRecentFixtures(10)
  const leaderboard = useLeaderboard(groupId)
  const groupFixtures = useGroupFixtures(groupId)

  const pending = (groupFixtures.data ?? []).filter((f) => f.open && f.myOutcome == null).length
  const myEntry = leaderboard.data?.find((e) => e.userId === user?.id)
  const myRank = myEntry ? (leaderboard.data?.indexOf(myEntry) ?? 0) + 1 : null
  const liveCount = live.data?.length ?? 0

  const cta = !active
    ? { label: 'Gruba katıl', href: '/group' }
    : pending > 0
      ? { label: `Tahminleri gir · ${pending} maç`, href: '/predictions' }
      : { label: 'Tahminlerim', href: '/predictions' }

  // One block per competition — the season that actually has standings.
  const primaryMap = new Map<number, League>()
  for (const l of leagues) {
    const existing = primaryMap.get(l.apiFootballId)
    if (!existing || l.season < existing.season) primaryMap.set(l.apiFootballId, l)
  }
  const primaryLeagues = [...primaryMap.values()]
  const visibleLeagues =
    filter === 'all' ? primaryLeagues : primaryLeagues.filter((l) => l.id === filter)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #0c2a20 0%, #0d1a17 46%, #0e141b 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-8 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <div className="flex items-center gap-2 text-brand-300">
            <BallMark size={16} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">ExtraTime</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-100 sm:text-3xl">
            Merhaba, {user?.displayName ?? 'oyuncu'}
          </h1>
          <p className="mt-1 max-w-md text-sm text-ink-300">
            {active
              ? `${active.name} · tahmin et, puan topla, şampiyon ol.`
              : 'Arkadaşlarınla bir tahmin ligi kur, maçlara tahmin gir, şampiyonu belirleyin.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to={cta.href}>
              <Button size="lg" className="shadow-lg shadow-brand-900/30">
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {liveCount > 0 && (
              <a
                href="#canli"
                className="flex items-center gap-2 rounded-full border border-loss/30 bg-loss/10 px-3 py-1.5 text-xs font-semibold text-loss"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
                </span>
                {liveCount} maç canlı
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Group snapshot */}
      {active ? (
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Sıralaman" value={myRank ? `${myRank}.` : '—'} accent />
          <MiniStat label="Puanın" value={myEntry?.points ?? 0} />
          <MiniStat label="Bekleyen tahmin" value={pending} />
        </div>
      ) : null}

      {/* Live */}
      {liveCount > 0 && (
        <section id="canli" className="scroll-mt-20">
          <SectionTitle live>Canlı</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.data!.map((f) => (
              <LiveMatchCard key={f.id} fixture={f} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming & recent */}
      <StripSection
        title="Yaklaşan Maçlar"
        loading={upcoming.isLoading}
        fixtures={upcoming.data ?? []}
        variant="upcoming"
      />
      <StripSection
        title="Son Sonuçlar"
        loading={recent.isLoading}
        fixtures={recent.data ?? []}
        variant="result"
      />

      {/* League standings */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle>Ligler</SectionTitle>
          {primaryLeagues.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                Tümü
              </FilterChip>
              {primaryLeagues.map((l) => (
                <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)}>
                  {l.name}
                </FilterChip>
              ))}
            </div>
          )}
        </div>

        {leaguesQ.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : !primaryLeagues.length ? (
          <EmptyState title="Henüz veri yok" description="Ligler senkronize edildiğinde görünecek." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleLeagues.map((l) => (
              <LeagueBlock key={l.id} league={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <Card>
      <CardBody className="px-4 py-3">
        <div
          className={`text-2xl font-extrabold tabular-nums ${accent ? 'text-brand-300' : 'text-ink-100'}`}
        >
          {value}
        </div>
        <div className="mt-0.5 text-xs text-ink-400">{label}</div>
      </CardBody>
    </Card>
  )
}

function SectionTitle({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <h2
      className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${live ? 'text-loss' : 'text-ink-300'}`}
    >
      {live && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
        </span>
      )}
      {children}
    </h2>
  )
}

function StripSection({
  title,
  loading,
  fixtures,
  variant,
}: {
  title: string
  loading: boolean
  fixtures: Fixture[]
  variant: 'upcoming' | 'result'
}) {
  return (
    <section>
      <div className="mb-2">
        <SectionTitle>{title}</SectionTitle>
      </div>
      {loading ? (
        <div className="flex gap-3">
          <Skeleton className="h-24 w-56" />
          <Skeleton className="h-24 w-56" />
          <Skeleton className="h-24 w-56" />
        </div>
      ) : fixtures.length === 0 ? (
        <Card>
          <CardBody className="py-6 text-center text-sm text-ink-500">
            {variant === 'upcoming' ? 'Yaklaşan maç yok' : 'Sonuç yok'}
          </CardBody>
        </Card>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {fixtures.map((f) => (
            <MatchCard key={f.id} fixture={f} variant={variant} />
          ))}
        </div>
      )}
    </section>
  )
}

function MatchCard({ fixture, variant }: { fixture: Fixture; variant: 'upcoming' | 'result' }) {
  const finished = variant === 'result'
  return (
    <Link
      to={`/matches/${fixture.id}`}
      className="w-56 shrink-0 rounded-card border border-ink-800 bg-ink-900 p-3 transition hover:border-ink-700"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-500">
        <TeamLogo apiId={fixture.leagueApiId} kind="league" size={13} />
        <span className="truncate">{fixture.leagueName}</span>
        <span className="ml-auto shrink-0">
          {finished ? formatDate(fixture.kickoffAt) : formatTime(fixture.kickoffAt)}
        </span>
      </div>
      <TeamRow
        team={fixture.home}
        score={finished ? fixture.homeScore : null}
        win={finished && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0)}
      />
      <TeamRow
        team={fixture.away}
        score={finished ? fixture.awayScore : null}
        win={finished && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0)}
      />
      {!finished && (
        <div className="mt-1.5 text-[11px] text-ink-500">{formatDateTime(fixture.kickoffAt)}</div>
      )}
    </Link>
  )
}

function TeamRow({ team, score, win }: { team: Fixture['home']; score: number | null; win: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <TeamLogo apiId={team.apiFootballId} size={18} />
      <span
        className={`flex-1 truncate text-sm ${win ? 'font-semibold text-ink-100' : 'text-ink-300'}`}
      >
        {team.name}
      </span>
      {score !== null && (
        <span className={`text-sm tabular-nums ${win ? 'font-bold text-ink-100' : 'text-ink-400'}`}>
          {score}
        </span>
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

function LeagueBlock({ league }: { league: League }) {
  const standings = useStandings(league.id)
  const scorers = useTopScorers(league.id)
  const leader = scorers.data?.[0]
  const top5 = standings.data?.slice(0, 5) ?? []

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <span className="flex items-center gap-2 font-semibold text-ink-100">
          <TeamLogo apiId={league.apiFootballId} kind="league" size={22} />
          {league.name}
        </span>
        <Link to={`/leagues/${league.id}`} className="text-xs text-brand-300 hover:underline">
          Detay →
        </Link>
      </div>
      <CardBody className="space-y-3">
        {standings.isLoading ? (
          <Skeleton className="h-40" />
        ) : top5.length ? (
          <div className="space-y-0.5">
            {top5.map((row, i) => (
              <Link
                key={row.teamId}
                to={`/teams/${row.teamId}`}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition hover:bg-ink-850"
              >
                <span
                  className={`w-5 text-center text-xs font-semibold ${i === 0 ? 'text-brand-400' : 'text-ink-500'}`}
                >
                  {row.position}
                </span>
                <TeamLogo apiId={row.teamApiId} size={20} />
                <span className="flex-1 truncate text-ink-200">{row.teamName}</span>
                <span className="hidden text-xs text-ink-500 sm:inline">{row.played} maç</span>
                <span className="w-7 text-right font-bold text-ink-100">{row.points}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-2 py-1 text-sm text-ink-500">Puan durumu yok</p>
        )}

        {leader && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <PlayerAvatar playerApiId={leader.playerApiId} name={leader.playerName} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {leader.teamApiId !== null && <TeamLogo apiId={leader.teamApiId} size={16} />}
                <span className="truncate text-sm font-semibold text-ink-100">
                  {leader.playerName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-300/90">
                <Crown className="h-3 w-3" /> Gol Kralı
              </div>
            </div>
            <div className="flex items-baseline gap-1 text-amber-300">
              <Trophy className="h-4 w-4" />
              <span className="text-xl font-extrabold">{leader.goals}</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
