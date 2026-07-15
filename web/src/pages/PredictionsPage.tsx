import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useLeagues } from '@/features/football/hooks'
import type { Fixture } from '@/features/football/types'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useMyPredictions } from '@/features/groups/hooks'
import type { MyPrediction } from '@/features/groups/types'
import { MatchPredictCard } from '@/features/predictions/MatchPredictCard'
import { isFinished } from '@/features/football/matchStatus'
import { TeamLogo } from '@/components/TeamLogo'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'

export function PredictionsPage() {
  const { active, isLoading: groupLoading } = useActiveGroup()
  const leaguesQ = useLeagues(true)
  const leagues = leaguesQ.data ?? []

  const upcomingQueries = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['fixtures', l.id, 'upcoming'],
      queryFn: () => api.get<{ fixtures: Fixture[] }>(`/leagues/${l.id}/fixtures?status=upcoming`),
    })),
  })

  const myPreds = useMyPredictions(active?.id ?? 0)

  if (groupLoading) return <Skeleton className="h-64" />
  if (!active) {
    return (
      <EmptyState
        title="Önce bir gruba katıl"
        description="Tahmin girebilmek için bir grup gerekiyor."
        action={
          <Link to="/group">
            <Button>Gruba git</Button>
          </Link>
        }
      />
    )
  }

  const upcoming = upcomingQueries
    .flatMap((q) => q.data?.fixtures ?? [])
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
  const loadingUpcoming = leaguesQ.isLoading || upcomingQueries.some((q) => q.isLoading)
  const predByFixture = new Map(myPreds.data?.map((p) => [p.fixtureId, p]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Tahminler</h1>
        <p className="text-sm text-ink-400">
          {active.name} · {upcoming.length} yaklaşan maç
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Yaklaşan Maçlar
        </h2>
        {loadingUpcoming ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="Yaklaşan maç yok"
            description="Şu an tahmin girilecek yaklaşan maç bulunmuyor."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((f) => {
              const p = predByFixture.get(f.id)
              return (
                <MatchPredictCard
                  key={f.id}
                  fixture={f}
                  groupId={active.id}
                  existingHome={p?.predictedHome}
                  existingAway={p?.predictedAway}
                />
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Geçmiş Tahminlerim
        </h2>
        <Card>
          {myPreds.isLoading ? (
            <Skeleton className="m-4 h-32" />
          ) : !myPreds.data?.length ? (
            <EmptyState title="Henüz tahmin yok" description="Girdiğin tahminler burada listelenir." />
          ) : (
            <ul className="divide-y divide-ink-850">
              {myPreds.data.map((p) => (
                <MyPredictionRow key={p.fixtureId} prediction={p} />
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}

function pointsBadge(points: number | null) {
  if (points === null) return <Badge tone="neutral">—</Badge>
  if (points === 3) return <Badge tone="win">3 puan</Badge>
  if (points === 1) return <Badge tone="warning">1 puan</Badge>
  return <Badge tone="loss">0 puan</Badge>
}

function MyPredictionRow({ prediction: p }: { prediction: MyPrediction }) {
  const finished = isFinished(p.status)
  return (
    <li className="flex items-center gap-3 px-4 py-2 text-sm">
      <div className="w-16 shrink-0 text-xs text-ink-500">{formatDate(p.kickoffAt)}</div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <TeamLogo apiId={p.homeApiId} size={16} />
        <span className="truncate text-ink-200">{p.homeName}</span>
        <span className="mx-1 text-ink-500">-</span>
        <span className="truncate text-ink-200">{p.awayName}</span>
        <TeamLogo apiId={p.awayApiId} size={16} />
      </div>
      <div className="shrink-0 font-mono text-ink-100">
        {p.predictedHome}-{p.predictedAway}
        {finished && (
          <span className="ml-2 text-xs text-ink-500">
            (maç {p.homeScore}-{p.awayScore})
          </span>
        )}
      </div>
      <div className="w-16 shrink-0 text-right">{pointsBadge(p.pointsAwarded)}</div>
    </li>
  )
}
