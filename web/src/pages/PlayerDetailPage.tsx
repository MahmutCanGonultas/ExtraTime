import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { usePlayer } from '@/features/football/hooks'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

export function PlayerDetailPage() {
  const { apiId } = useParams()
  const playerApiId = Number(apiId)
  const { data, isLoading, isError, refetch } = usePlayer(playerApiId)

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Oyuncu bulunamadı" />

  const facts = [
    data.position && { label: 'Mevki', value: data.position },
    data.nationality && { label: 'Uyruk', value: data.nationality },
    data.age != null && { label: 'Yaş', value: String(data.age) },
    data.height && { label: 'Boy', value: data.height },
    data.weight && { label: 'Kilo', value: data.weight },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-5">
          <PlayerAvatar playerApiId={data.playerApiId} name={data.name} size={88} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink-100">{data.name}</h1>
            {(data.firstname || data.lastname) && (
              <p className="text-sm text-ink-400">
                {[data.firstname, data.lastname].filter(Boolean).join(' ')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              {facts.map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-wide text-ink-500">{f.label}</div>
                  <div className="text-sm font-medium text-ink-100">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <div className="section-label px-4 pt-3 text-ink-400">Sezon istatistikleri</div>
        <Table>
          <thead>
            <tr>
              <Th>Sezon</Th>
              <Th>Takım</Th>
              <Th className="text-center">Maç</Th>
              <Th className="hidden text-center sm:table-cell">Dk</Th>
              <Th className="text-center">Gol</Th>
              <Th className="text-center">Asist</Th>
              <Th className="hidden text-center sm:table-cell">🟨</Th>
              <Th className="hidden text-center sm:table-cell">🟥</Th>
              <Th className="hidden text-center md:table-cell">Reyting</Th>
            </tr>
          </thead>
          <tbody>
            {data.seasons.map((s) => (
              <Tr key={`${s.leagueId}-${s.season}`}>
                <Td className="whitespace-nowrap text-ink-300">
                  <Link to={`/leagues/${s.leagueId}`} className="flex items-center gap-1.5 hover:text-brand-300">
                    <TeamLogo apiId={s.leagueApiId} kind="league" size={16} />
                    {seasonLabel(s.season)}
                  </Link>
                </Td>
                <Td>
                  <span className="flex items-center gap-2">
                    {s.teamApiId != null && <TeamLogo apiId={s.teamApiId} size={18} />}
                    <span className="truncate text-ink-100">{s.teamName ?? '—'}</span>
                  </span>
                </Td>
                <Td className="text-center text-ink-300">{s.appearances ?? '—'}</Td>
                <Td className="hidden text-center text-ink-400 sm:table-cell">{s.minutes ?? '—'}</Td>
                <Td className="text-center font-bold text-ink-100">{s.goals ?? 0}</Td>
                <Td className="text-center font-semibold text-ink-100">{s.assists ?? 0}</Td>
                <Td className="hidden text-center text-ink-400 sm:table-cell">{s.yellowCards ?? 0}</Td>
                <Td className="hidden text-center text-ink-400 sm:table-cell">{s.redCards ?? 0}</Td>
                <Td className="hidden text-center md:table-cell">
                  {s.rating != null ? (
                    <span className="font-medium text-brand-300">{s.rating.toFixed(2)}</span>
                  ) : (
                    '—'
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
