import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import {
  useLeagues,
  useLiveFixtures,
  useRecentFixtures,
  useUpcomingFixtures,
} from '@/features/football/hooks'
import type { League } from '@/features/football/types'
import { LiveMatchCard } from '@/features/football/LiveMatchCard'
import { FixtureList } from '@/features/football/FixtureList'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useLeaderboard } from '@/features/groups/hooks'
import { Leaderboard } from '@/features/groups/Leaderboard'
import { useAuth } from '@/features/auth/AuthContext'
import { TeamLogo } from '@/components/TeamLogo'
import { BallMark } from '@/components/Brand'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/feedback'

export function HomePage() {
  const { user } = useAuth()
  const { active } = useActiveGroup()
  const groupId = active?.id ?? 0

  const live = useLiveFixtures()
  const upcoming = useUpcomingFixtures(12)
  const recent = useRecentFixtures(10)
  const leaguesQ = useLeagues(false)
  const leaderboard = useLeaderboard(groupId)

  const myEntry = leaderboard.data?.find((e) => e.userId === user?.id)
  const myRank = myEntry ? (leaderboard.data?.indexOf(myEntry) ?? 0) + 1 : null
  const liveCount = live.data?.length ?? 0

  const cta = !active
    ? { label: 'Gruba katıl', href: '/group' }
    : { label: 'Tahminlere gir', href: '/predictions' }

  // One card per competition — its current season.
  const currentLeagues: League[] = (leaguesQ.data ?? [])
    .filter((l) => l.isCurrent)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      {/* Matchday hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <BallMark size={200} className="pointer-events-none absolute -bottom-14 -left-10 text-brand-400/[0.04]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-6 py-8 sm:px-10">
          <div>
            <div className="flex items-center gap-2 text-brand-300">
              <BallMark size={16} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]">ExtraTime</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-100 sm:text-4xl">
              Merhaba, {user?.displayName ?? 'oyuncu'}
            </h1>
            <p className="mt-2 text-sm text-ink-300">
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
                className="flex items-center gap-2 rounded-full border border-loss/30 bg-loss/10 px-3 py-1.5 text-xs font-semibold text-loss"
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

      {/* Dashboard: matches on the left, standings + leagues on the right */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {liveCount > 0 && (
            <section id="canli" className="scroll-mt-20">
              <SectionTitle live>Canlı</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {live.data!.map((f) => (
                  <LiveMatchCard key={f.id} fixture={f} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Yaklaşan maçlar</SectionTitle>
            <Card className="mt-3 overflow-hidden">
              {upcoming.isLoading ? (
                <Skeleton className="m-4 h-40" />
              ) : upcoming.data?.length ? (
                <FixtureList fixtures={upcoming.data} showLeague />
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
              ) : recent.data?.length ? (
                <FixtureList fixtures={recent.data} showLeague />
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
            <SectionTitle>Ligler</SectionTitle>
            <Card className="mt-3 overflow-hidden">
              {leaguesQ.isLoading ? (
                <Skeleton className="m-4 h-40" />
              ) : (
                <ul className="divide-y divide-ink-850">
                  {currentLeagues.map((l) => (
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
      className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${live ? 'text-loss' : 'text-ink-300'}`}
    >
      {live && <LiveDot />}
      {children}
    </h2>
  )
}
