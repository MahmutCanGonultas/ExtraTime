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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[...byCompetition.values()].map((seasons) => {
          const head = seasons[0]
          // Current season first, then the rest newest → oldest.
          const current = seasons.find((s) => s.isCurrent) ?? seasons[0]
          const past = seasons.filter((s) => s.id !== current.id).sort((a, b) => b.season - a.season)
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

                <Link
                  to={`/leagues/${current.id}`}
                  className="mt-3 flex items-center justify-between rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 transition hover:bg-brand-500/15"
                >
                  <span className="text-sm font-semibold text-ink-100">{seasonLabel(current.season)}</span>
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-950">
                    Güncel
                  </span>
                </Link>

                {past.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {past.map((s) => (
                      <Link
                        key={s.id}
                        to={`/leagues/${s.id}`}
                        className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 transition hover:border-brand-500 hover:text-brand-300"
                      >
                        {seasonLabel(s.season)}
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
