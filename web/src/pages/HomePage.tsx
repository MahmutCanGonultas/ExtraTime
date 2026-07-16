import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useLeagues, useLiveFixtures } from '@/features/football/hooks'
import type { League } from '@/features/football/types'
import { LiveMatchCard } from '@/features/football/LiveMatchCard'
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
  const leaguesQ = useLeagues(true)
  const leaderboard = useLeaderboard(groupId)

  const myEntry = leaderboard.data?.find((e) => e.userId === user?.id)
  const myRank = myEntry ? (leaderboard.data?.indexOf(myEntry) ?? 0) + 1 : null
  const liveCount = live.data?.length ?? 0

  const cta = !active
    ? { label: 'Gruba katıl', href: '/group' }
    : { label: 'Tahminlere gir', href: '/predictions' }

  // One entry per competition for the quiet "Ligler" door.
  const primaryMap = new Map<number, League>()
  for (const l of leaguesQ.data ?? []) {
    const e = primaryMap.get(l.apiFootballId)
    if (!e || l.season < e.season) primaryMap.set(l.apiFootballId, l)
  }
  const leagues = [...primaryMap.values()]

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* 1 — Matchday hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-3/4 text-brand-200/10 sm:block" />
        <BallMark
          size={220}
          className="pointer-events-none absolute -bottom-14 -left-10 text-brand-400/[0.04]"
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
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
          <div className="mt-6 flex flex-wrap items-center gap-3">
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

      {/* 2 — Live now (only when something is live) */}
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

      {/* 3 — Group standing (only with an active group) */}
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

      {/* 5 — Quiet door to leagues */}
      {leagues.length > 0 && (
        <Link
          to="/leagues"
          className="flex items-center gap-3 rounded-card border border-ink-800 bg-ink-900 px-5 py-4 transition hover:border-ink-700"
        >
          <div className="flex -space-x-1.5">
            {leagues.slice(0, 7).map((l) => (
              <TeamLogo key={l.id} apiId={l.apiFootballId} kind="league" size={22} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-100">Ligler ve puan durumları</div>
            <div className="text-xs text-ink-400">
              {leagues.length} lig · puan durumu, gol kralları, fikstür
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" />
        </Link>
      )}
    </div>
  )
}

function SectionTitle({ children, live }: { children: React.ReactNode; live?: boolean }) {
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

