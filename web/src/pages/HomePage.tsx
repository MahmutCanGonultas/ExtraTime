import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, CalendarClock } from 'lucide-react'
import {
  useLeagues,
  useLiveFixtures,
  useRecentFixtures,
  useUpcomingFixtures,
} from '@/features/football/hooks'
import type { Fixture, League } from '@/features/football/types'
import { isFinished, isLive } from '@/features/football/matchStatus'
import { matchProminence } from '@/features/football/prominence'
import { LiveMatches } from '@/features/football/LiveMatches'
import { FixtureList } from '@/features/football/FixtureList'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useLeaderboard, useGroupFixtures } from '@/features/groups/hooks'
import { Leaderboard } from '@/features/groups/Leaderboard'
import { useAuth } from '@/features/auth/AuthContext'
import { TeamLogo } from '@/components/TeamLogo'
import { BallMark } from '@/components/Brand'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'

// The home feed only surfaces Europe's big five, the Süper Lig and the two main
// UEFA club competitions — the matches this group actually cares about.
const HOME_LEAGUES = [39, 140, 78, 135, 61, 203, 2, 3]
const HOME_LEAGUE_SET = new Set(HOME_LEAGUES)

// Short Turkish names so long competitions fit the compact league chips.
const LEAGUE_SHORT: Record<number, string> = {
  2: 'Şampiyonlar Ligi',
  3: 'Avrupa Ligi',
  848: 'Konferans Ligi',
}
const shortLeagueName = (apiId: number, full: string) => LEAGUE_SHORT[apiId] ?? full

// Signature colours for the featured-league cards (shared with the Leagues page).
const LEAGUE_COLOR: Record<number, string> = {
  39: '#8b5cf6', // Premier League
  140: '#f97316', // La Liga
  78: '#ef4444', // Bundesliga
  135: '#3b82f6', // Serie A
  61: '#14b8a6', // Ligue 1
  203: '#f43f5e', // Süper Lig
  2: '#22d3ee', // Champions League
  3: '#f59e0b', // Europa League
}

// True when an ISO timestamp falls on today's local calendar date — so a match two
// days out is never mislabelled "Günün maçı".
function isTodayLocal(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function HomePage() {
  const { user } = useAuth()
  const { active } = useActiveGroup()
  const groupId = active?.id ?? 0

  const live = useLiveFixtures()
  // Fetch generously, then keep only the leagues we feature on the home page.
  const upcoming = useUpcomingFixtures(50)
  const recent = useRecentFixtures(50)
  const leaguesQ = useLeagues(false)
  const leaderboard = useLeaderboard(groupId)
  const groupFx = useGroupFixtures(groupId)

  const myEntry = leaderboard.data?.find((e) => e.userId === user?.id)
  const myRank = myEntry ? (leaderboard.data?.indexOf(myEntry) ?? 0) + 1 : null
  const liveCount = live.data?.length ?? 0

  const cta = !active
    ? { label: 'Gruba katıl', href: '/group' }
    : { label: 'Tahminlere gir', href: '/predictions' }

  const inHome = (f: Fixture) => HOME_LEAGUE_SET.has(f.leagueApiId)
  const gfx = groupFx.data ?? []
  const groupIds = new Set(gfx.map((f) => f.id))

  // Merge the group's own matches with the big leagues' fixtures, then rank: the
  // group's matches first, then the biggest-name matches (same prominence order as
  // search), then by kick-off. So the home feed leads with what the group is
  // playing and the marquee fixtures — not a random lower-table game.
  function ranked(pool: Fixture[], soonestFirst: boolean): Fixture[] {
    const seen = new Set<number>()
    return pool
      .filter((f) => {
        if (seen.has(f.id)) return false
        seen.add(f.id)
        return true
      })
      .sort((a, b) => {
        const ga = groupIds.has(a.id) ? 0 : 1
        const gb = groupIds.has(b.id) ? 0 : 1
        if (ga !== gb) return ga - gb
        const pa = matchProminence(a.home.apiFootballId, a.away.apiFootballId)
        const pb = matchProminence(b.home.apiFootballId, b.away.apiFootballId)
        if (pa !== pb) return pa - pb
        const ta = new Date(a.kickoffAt).getTime()
        const tb = new Date(b.kickoffAt).getTime()
        return soonestFirst ? ta - tb : tb - ta
      })
  }
  const isUpcomingStatus = (f: Fixture) => !isFinished(f.status) && !isLive(f.status)

  // Group matches come from any league; the general feed is limited to the big ones.
  const upcomingShown = ranked(
    [...gfx, ...(upcoming.data ?? []).filter(inHome)].filter(isUpcomingStatus),
    true,
  ).slice(0, 14)
  const recentShown = ranked(
    [...gfx, ...(recent.data ?? []).filter(inHome)].filter((f) => isFinished(f.status)),
    false,
  ).slice(0, 12)
  // Live = only the group's own matches (the backend already scopes /fixtures/live
  // to group_fixtures). Those are the ones refreshed every minute, so the feed stays
  // truly live instead of showing a stale UEFA score from the slow sync.
  const liveShown = ranked((live.data ?? []).filter((f) => isLive(f.status)), true)

  // The top-ranked upcoming match (a group / marquee game) — labelled "Günün maçı"
  // only when it's actually today, otherwise "Yaklaşan maç".
  const spotlight = upcomingShown[0] ?? null
  const spotlightToday = spotlight ? isTodayLocal(spotlight.kickoffAt) : false

  // The eight featured competitions, current season, in our preferred order.
  const featured = HOME_LEAGUES.map((id) =>
    (leaguesQ.data ?? []).find((l) => l.apiFootballId === id && l.isCurrent),
  ).filter((l): l is League => Boolean(l))

  return (
    <div className="space-y-6">
      {/* Matchday hero */}
      <section
        className="elevate relative overflow-hidden rounded-card border border-emerald-900/40"
        style={{ backgroundImage: 'linear-gradient(125deg, #0c2b20 0%, #10231c 45%, #0e1626 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(72% 95% at 90% -12%, rgba(16,185,129,0.24), transparent 55%)',
          }}
        />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-emerald-200/[0.07] sm:block" />
        <BallMark size={210} mono className="pointer-events-none absolute -bottom-16 -right-10 text-emerald-400/[0.06]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-6 py-8 sm:px-10">
          <div>
            {/* Big, epic brand lock-up — the added-time board with an emerald glow. */}
            <div className="flex items-center gap-3">
              <BallMark size={48} className="drop-shadow-[0_0_18px_rgba(16,185,129,0.5)]" />
              <span className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                EXTRA
                <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
                  TIME
                </span>
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Merhaba, {user?.displayName ?? 'oyuncu'}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              {active ? (
                <>
                  {active.name}
                  {myRank && (
                    <>
                      {' · '}
                      <span className="font-semibold text-brand-300">{myRank}. sıra</span>
                      {' · '}
                      {myEntry?.points ?? 0} puan
                    </>
                  )}
                </>
              ) : (
                'Arkadaşlarınla bir tahmin ligi kur, maçları ekle, herkes tahmin girsin.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {liveCount > 0 && (
              <a
                href="#canli"
                className="flex items-center gap-2 rounded-full border border-loss/30 bg-loss/10 px-3 py-2 text-xs font-semibold text-loss"
              >
                <LiveDot />
                {liveCount} maç canlı
              </a>
            )}
            <Link to={cta.href}>
              <Button size="lg" className="shadow-lg shadow-brand-900/30">
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured league quick-nav — vivid, colour-coded */}
      {featured.length > 0 && (
        <section>
          <SectionTitle>Öne çıkan ligler</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {featured.map((l) => (
              <FeaturedLeagueChip key={l.id} league={l} color={LEAGUE_COLOR[l.apiFootballId] ?? '#c2f542'} />
            ))}
          </div>
        </section>
      )}

      {/* Match of the day — only "günün maçı" when it's genuinely today */}
      {spotlight && (
        <section>
          <SectionTitle>{spotlightToday ? 'Günün maçı' : 'Yaklaşan maç'}</SectionTitle>
          <div className="mt-3">
            <MatchSpotlight fixture={spotlight} />
          </div>
        </section>
      )}

      {/* Dashboard: matches on the left, standings on the right */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {liveCount > 0 && (
            <section id="canli" className="scroll-mt-20">
              <SectionTitle live>Canlı</SectionTitle>
              <div className="mt-3">
                <LiveMatches fixtures={liveShown} />
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Yaklaşan maçlar</SectionTitle>
            <Card className="mt-3 overflow-hidden">
              {upcoming.isLoading ? (
                <Skeleton className="m-4 h-40" />
              ) : upcomingShown.length ? (
                <FixtureList fixtures={upcomingShown} showLeague groupIds={groupIds} />
              ) : (
                <CardBody className="py-6 text-center text-sm text-ink-500">Yaklaşan maç yok.</CardBody>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle>Son sonuçlar</SectionTitle>
            <Card className="mt-3 overflow-hidden">
              {recent.isLoading ? (
                <Skeleton className="m-4 h-40" />
              ) : recentShown.length ? (
                <FixtureList fixtures={recentShown} showLeague groupIds={groupIds} />
              ) : (
                <CardBody className="py-6 text-center text-sm text-ink-500">Sonuç yok.</CardBody>
              )}
            </Card>
          </section>
        </div>

        <aside className="space-y-6">
          {active && (
            <section>
              <div className="flex items-center justify-between">
                <SectionTitle>Grup sıralaması</SectionTitle>
                <Link to="/group" className="text-xs font-medium text-brand-300 hover:underline">
                  Grup →
                </Link>
              </div>
              <Card className="mt-3 overflow-hidden">
                {leaderboard.isLoading ? (
                  <Skeleton className="m-4 h-32" />
                ) : leaderboard.data?.length ? (
                  <Leaderboard entries={leaderboard.data} currentUserId={user?.id} />
                ) : (
                  <CardBody className="py-6 text-center text-sm text-ink-500">
                    Maçlar sonuçlandıkça tablo dolacak.
                  </CardBody>
                )}
              </Card>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between">
              <SectionTitle>Tüm ligler</SectionTitle>
              <Link to="/leagues" className="text-xs font-medium text-brand-300 hover:underline">
                Ligler →
              </Link>
            </div>
            <Card className="mt-3 overflow-hidden">
              {leaguesQ.isLoading ? (
                <Skeleton className="m-4 h-40" />
              ) : (
                <ul className="divide-y divide-ink-850">
                  {featured.map((l) => (
                    <li key={l.id}>
                      <Link
                        to={`/leagues/${l.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-ink-850"
                      >
                        <TeamLogo apiId={l.apiFootballId} kind="league" size={24} />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{l.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </aside>
      </div>
    </div>
  )
}

function FeaturedLeagueChip({ league, color }: { league: League; color: string }) {
  return (
    <Link
      to={`/leagues/${league.id}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-ink-800 bg-ink-900 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-ink-700"
      style={{ backgroundImage: `radial-gradient(120% 100% at 100% 0%, ${color}2b 0%, transparent 60%)` }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      {/* White tile so dark crests (Premier League's purple) stay visible. */}
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-black/5">
        <TeamLogo apiId={league.apiFootballId} kind="league" size={28} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-ink-100">
          {shortLeagueName(league.apiFootballId, league.name)}
        </span>
        <span className="block truncate text-[11px] text-ink-400">{league.country}</span>
      </span>
    </Link>
  )
}

function MatchSpotlight({ fixture }: { fixture: Fixture }) {
  return (
    <Link
      to={`/matches/${fixture.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-5 transition hover:border-brand-500/40"
      style={{ backgroundImage: 'radial-gradient(120% 90% at 50% 0%, rgba(194,245,66,0.08), transparent 60%)' }}
    >
      <div className="mb-4 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-300">
        <TeamLogo apiId={fixture.leagueApiId} kind="league" size={16} />
        {fixture.leagueName}
      </div>
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <TeamLogo apiId={fixture.home.apiFootballId} size={56} />
          <span className="truncate text-sm font-semibold text-ink-100">{fixture.home.name}</span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-xl font-black text-ink-500">VS</span>
          <span className="flex items-center gap-1 rounded-full bg-ink-850 px-2.5 py-1 text-[11px] font-medium text-ink-300">
            <CalendarClock className="h-3 w-3" />
            {formatDateTime(fixture.kickoffAt)}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <TeamLogo apiId={fixture.away.apiFootballId} size={56} />
          <span className="truncate text-sm font-semibold text-ink-100">{fixture.away.name}</span>
        </div>
      </div>
    </Link>
  )
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
    </span>
  )
}

function SectionTitle({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <h2
      className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${live ? 'text-loss' : 'text-ink-200'}`}
    >
      {live ? <LiveDot /> : <span className="h-4 w-1 rounded-full bg-brand-500" />}
      {children}
    </h2>
  )
}
