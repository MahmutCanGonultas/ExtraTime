import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  useLeagueFixtures,
  useLeagues,
  useStandings,
  useTopAssists,
  useTopScorers,
} from '@/features/football/hooks'
import { StandingsTable } from '@/features/football/StandingsTable'
import { FixtureList } from '@/features/football/FixtureList'
import { AssistsTable, ScorersTable } from '@/features/football/PlayerTables'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

const TABS = [
  { key: 'standings', label: 'Puan Durumu' },
  { key: 'fixtures', label: 'Fikstür' },
  { key: 'scorers', label: 'Gol Krallığı' },
  { key: 'assists', label: 'Asist Krallığı' },
]

export function LeagueDetailPage() {
  const { id } = useParams()
  const leagueId = Number(id)
  const [tab, setTab] = useState('standings')
  const { data: leagues } = useLeagues(false)
  const league = leagues?.find((l) => l.id === leagueId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {league && <TeamLogo apiId={league.apiFootballId} kind="league" size={40} />}
        <div>
          <h1 className="text-2xl font-bold text-ink-100">{league?.name ?? 'Lig'}</h1>
          {league && (
            <p className="text-sm text-ink-400">
              {league.country} · {league.season} sezonu
            </p>
          )}
        </div>
      </div>

      <Tabs items={TABS} active={tab} onChange={setTab} />

      <Card className="p-1">
        {tab === 'standings' && <StandingsTab leagueId={leagueId} />}
        {tab === 'fixtures' && <FixturesTab leagueId={leagueId} />}
        {tab === 'scorers' && <ScorersTab leagueId={leagueId} />}
        {tab === 'assists' && <AssistsTab leagueId={leagueId} />}
      </Card>
    </div>
  )
}

function Loading() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  )
}

function StandingsTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useStandings(leagueId)
  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Puan durumu yok" />
  return <StandingsTable rows={data} />
}

function FixturesTab({ leagueId }: { leagueId: number }) {
  const [filter, setFilter] = useState<'upcoming' | 'finished' | 'all'>('all')
  const { data, isLoading, isError, refetch } = useLeagueFixtures(leagueId, filter)
  return (
    <div>
      <div className="flex gap-2 p-3">
        {(['all', 'upcoming', 'finished'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              filter === f ? 'bg-ink-800 text-brand-300' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {f === 'all' ? 'Tümü' : f === 'upcoming' ? 'Yaklaşan' : 'Bitti'}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title="Maç bulunamadı" />
      ) : (
        <FixtureList fixtures={data} />
      )}
    </div>
  )
}

function ScorersTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useTopScorers(leagueId)
  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Gol krallığı verisi yok" />
  return <ScorersTable rows={data} />
}

function AssistsTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useTopAssists(leagueId)
  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Asist krallığı verisi yok" />
  return <AssistsTable rows={data} />
}
