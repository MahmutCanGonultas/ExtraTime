import { useParams } from 'react-router-dom'
import { useTeam } from '@/features/football/hooks'
import { FixtureList } from '@/features/football/FixtureList'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

export function TeamPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const { data, isLoading, isError, refetch } = useTeam(teamId)

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Takım bulunamadı" />

  const { team, fixtures } = data
  const location = [team.stadiumName, team.city].filter(Boolean).join(' · ')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <TeamLogo apiId={team.apiFootballId} size={56} />
        <div>
          <h1 className="text-2xl font-bold text-ink-100">{team.name}</h1>
          {location && <p className="text-sm text-ink-400">{location}</p>}
        </div>
      </div>

      <Card>
        <CardHeader title="Maçlar" />
        {fixtures.length ? (
          <FixtureList fixtures={fixtures} />
        ) : (
          <EmptyState title="Maç bulunamadı" />
        )}
      </Card>
    </div>
  )
}
