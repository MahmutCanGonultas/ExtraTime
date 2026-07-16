import { Link, useParams } from 'react-router-dom'
import { usePlayer } from '@/features/football/hooks'
import type { PlayerSeason } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Card } from '@/components/ui/Card'
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

  const primary = data.seasons[0]
  const facts = [
    data.position && { label: 'Mevki', value: data.position },
    data.nationality && { label: 'Uyruk', value: data.nationality },
    data.age != null && { label: 'Yaş', value: String(data.age) },
    data.height && { label: 'Boy', value: data.height },
    data.weight && { label: 'Kilo', value: data.weight },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const stats = primary
    ? [
        { label: 'Maç', value: primary.appearances ?? 0 },
        { label: 'Gol', value: primary.goals ?? 0, accent: true },
        { label: 'Asist', value: primary.assists ?? 0 },
        { label: 'Dakika', value: primary.minutes ?? 0 },
        { label: 'Reyting', value: primary.rating != null ? primary.rating.toFixed(2) : '—' },
      ]
    : []

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <div className="relative flex flex-wrap items-center gap-5 px-6 py-7 sm:px-8">
          <PlayerAvatar
            playerApiId={data.playerApiId}
            name={data.name}
            size={96}
            className="ring-2 ring-brand-500/40"
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-100">{data.name}</h1>
            {(data.firstname || data.lastname) && (
              <p className="text-sm text-ink-300">{[data.firstname, data.lastname].filter(Boolean).join(' ')}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {facts.map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-wide text-ink-500">{f.label}</div>
                  <div className="text-sm font-medium text-ink-100">{f.value}</div>
                </div>
              ))}
            </div>
            {primary?.teamName && (
              <Link
                to={primary.teamId ? `/teams/${primary.teamId}` : '#'}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/40 px-2.5 py-1 text-xs font-medium text-ink-200 transition hover:text-brand-300"
              >
                {primary.teamApiId != null && <TeamLogo apiId={primary.teamApiId} size={16} />}
                {primary.teamName}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Headline stats (latest season) */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label}>
              <div className="px-3 py-4 text-center">
                <div className={`score-num text-3xl font-extrabold ${s.accent ? 'text-brand-300' : 'text-ink-100'}`}>
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-500">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Season-by-season table */}
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
              <SeasonRow key={`${s.leagueId}-${s.season}`} s={s} />
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function SeasonRow({ s }: { s: PlayerSeason }) {
  return (
    <Tr>
      <Td className="whitespace-nowrap text-ink-300">
        <Link to={`/leagues/${s.leagueId}`} className="flex items-center gap-1.5 hover:text-brand-300">
          <TeamLogo apiId={s.leagueApiId} kind="league" size={16} />
          {seasonLabel(s.season)}
        </Link>
      </Td>
      <Td>
        <Link
          to={s.teamId ? `/teams/${s.teamId}` : '#'}
          className="flex items-center gap-2 hover:text-brand-300"
        >
          {s.teamApiId != null && <TeamLogo apiId={s.teamApiId} size={18} />}
          <span className="truncate text-ink-100">{s.teamName ?? '—'}</span>
        </Link>
      </Td>
      <Td className="text-center text-ink-300">{s.appearances ?? '—'}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.minutes ?? '—'}</Td>
      <Td className="text-center font-bold text-ink-100">{s.goals ?? 0}</Td>
      <Td className="text-center font-semibold text-ink-100">{s.assists ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.yellowCards ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.redCards ?? 0}</Td>
      <Td className="hidden text-center md:table-cell">
        {s.rating != null ? <span className="font-medium text-brand-300">{s.rating.toFixed(2)}</span> : '—'}
      </Td>
    </Tr>
  )
}
