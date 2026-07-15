import { Link } from 'react-router-dom'
import { useLeagues } from '@/features/football/hooks'
import type { League } from '@/features/football/types'
import { Card, CardBody } from '@/components/ui/Card'
import { TeamLogo } from '@/components/TeamLogo'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

export function LeaguesPage() {
  const { data: leagues, isLoading, isError, refetch } = useLeagues(false)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!leagues?.length) {
    return <EmptyState title="Henüz lig yok" description="Veriler senkronize edildiğinde burada görünecek." />
  }

  const byCompetition = new Map<number, League[]>()
  for (const league of leagues) {
    const list = byCompetition.get(league.apiFootballId) ?? []
    list.push(league)
    byCompetition.set(league.apiFootballId, list)
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink-100">Ligler</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...byCompetition.values()].map((seasons) => {
          const head = seasons[0]
          return (
            <Card key={head.apiFootballId}>
              <CardBody>
                <div className="flex items-center gap-3">
                  <TeamLogo apiId={head.apiFootballId} kind="league" size={36} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink-100">{head.name}</div>
                    <div className="text-xs text-ink-400">{head.country}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {seasons.map((s) => (
                    <Link
                      key={s.id}
                      to={`/leagues/${s.id}`}
                      className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-200 transition hover:border-brand-500 hover:text-brand-300"
                    >
                      {seasonLabel(s.season)}
                      {s.isActive && <span className="ml-1 text-brand-400">●</span>}
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
