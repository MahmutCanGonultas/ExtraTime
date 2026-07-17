import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTeamSquad } from '@/features/football/hooks'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(s: number): string {
  const n = (s + 1) % 100
  return `${s}/${n.toString().padStart(2, '0')}`
}

export function SquadPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const [season, setSeason] = useState<number | undefined>(undefined)
  const { data, isLoading, isError, refetch } = useTeamSquad(teamId, season)

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Kadro bulunamadı" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/teams/${teamId}`} className="flex items-center gap-3 transition hover:text-brand-300">
          <TeamLogo apiId={data.team.apiFootballId} size={44} />
          <div>
            <h1 className="text-2xl font-bold text-ink-100">{data.team.name}</h1>
            <p className="text-sm text-ink-400">
              Kadro{data.season ? ` · ${seasonLabel(data.season)}` : ''}
            </p>
          </div>
        </Link>
        {data.seasons.length > 0 && (
          <select
            value={data.season ?? ''}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="ml-auto rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm text-ink-200 outline-none focus:border-brand-500"
            aria-label="Sezon"
          >
            {data.seasons.map((s) => (
              <option key={s} value={s}>
                {seasonLabel(s)}
              </option>
            ))}
          </select>
        )}
      </div>

      <Card className="overflow-hidden">
        {data.squad.length === 0 ? (
          <EmptyState title="Bu sezon için kadro verisi yok" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Oyuncu</Th>
                <Th className="hidden text-center sm:table-cell">Mevki</Th>
                <Th className="hidden text-center sm:table-cell">Uyruk</Th>
                <Th className="text-center">Maç</Th>
                <Th className="hidden text-center md:table-cell">Dk</Th>
                <Th className="text-center">Gol</Th>
                <Th className="text-center">Asist</Th>
                <Th className="hidden text-center md:table-cell">Reyting</Th>
              </tr>
            </thead>
            <tbody>
              {data.squad.map((p) => (
                <Tr key={p.playerApiId}>
                  <Td>
                    <Link
                      to={`/players/${p.playerApiId}`}
                      className="flex items-center gap-2.5 hover:text-brand-300"
                    >
                      <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={30} />
                      <span className="truncate text-ink-100">{p.name}</span>
                    </Link>
                  </Td>
                  <Td className="hidden text-center text-ink-400 sm:table-cell">{p.position ?? '—'}</Td>
                  <Td className="hidden text-center text-ink-400 sm:table-cell">{p.nationality ?? '—'}</Td>
                  <Td className="text-center text-ink-300">{p.appearances ?? '—'}</Td>
                  <Td className="hidden text-center text-ink-400 md:table-cell">{p.minutes ?? '—'}</Td>
                  <Td className="text-center font-bold text-ink-100">{p.goals ?? 0}</Td>
                  <Td className="text-center font-semibold text-ink-100">{p.assists ?? 0}</Td>
                  <Td className="hidden text-center md:table-cell">
                    {p.rating != null ? (
                      <span className="font-medium text-brand-300">{p.rating.toFixed(2)}</span>
                    ) : (
                      '—'
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
