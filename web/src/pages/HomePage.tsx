import { Link } from 'react-router-dom'
import { useLeagues, useStandings, useTopScorers } from '@/features/football/hooks'
import type { League } from '@/features/football/types'
import { StandingsTable } from '@/features/football/StandingsTable'
import { ScorersTable } from '@/features/football/PlayerTables'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { TeamLogo } from '@/components/TeamLogo'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

export function HomePage() {
  const { data: leagues, isLoading, isError, refetch } = useLeagues(true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Ana Sayfa</h1>
        <p className="text-sm text-ink-400">Güncel sezon özetleri</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !leagues?.length ? (
        <EmptyState
          title="Henüz veri yok"
          description="Ligler senkronize edildiğinde özetler burada görünecek."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {leagues.map((league) => (
            <LeagueSummaryCard key={league.id} league={league} />
          ))}
        </div>
      )}
    </div>
  )
}

function LeagueSummaryCard({ league }: { league: League }) {
  const standings = useStandings(league.id)
  const scorers = useTopScorers(league.id)

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <TeamLogo apiId={league.apiFootballId} kind="league" size={22} />
            {league.name}
          </span>
        }
        action={
          <Link to={`/leagues/${league.id}`} className="text-xs text-brand-300 hover:underline">
            Detay →
          </Link>
        }
      />
      <CardBody className="space-y-4">
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Puan Durumu
          </h3>
          {standings.isLoading ? (
            <Skeleton className="h-32" />
          ) : standings.data?.length ? (
            <StandingsTable rows={standings.data.slice(0, 5)} compact />
          ) : (
            <p className="px-3 py-2 text-sm text-ink-500">Veri yok</p>
          )}
        </section>
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Gol Krallığı
          </h3>
          {scorers.isLoading ? (
            <Skeleton className="h-24" />
          ) : scorers.data?.length ? (
            <ScorersTable rows={scorers.data.slice(0, 3)} />
          ) : (
            <p className="px-3 py-2 text-sm text-ink-500">Veri yok</p>
          )}
        </section>
      </CardBody>
    </Card>
  )
}
