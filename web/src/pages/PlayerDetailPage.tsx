import { Link, useParams } from 'react-router-dom'
import { usePlayer } from '@/features/football/hooks'
import type { PlayerSeason } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Card } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { flagEmoji } from '@/lib/flags'

// The season key of the current campaign; a current-club row older than this
// means the player has left/retired.
const CURRENT_SEASON = 2026

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
    data.nationality && {
      label: 'Uyruk',
      value: `${flagEmoji(data.nationality)} ${data.nationality}`.trim(),
    },
    data.age != null && { label: 'Yaş', value: String(data.age) },
    data.height && { label: 'Boy', value: data.height },
    data.weight && { label: 'Kilo', value: data.weight },
    data.birthPlace && { label: 'Doğum yeri', value: data.birthPlace },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  // Career totals across every season we hold — the "10-year" summary.
  const totals = data.seasons.reduce(
    (a, s) => ({
      apps: a.apps + (s.appearances ?? 0),
      goals: a.goals + (s.goals ?? 0),
      assists: a.assists + (s.assists ?? 0),
    }),
    { apps: 0, goals: 0, assists: 0 },
  )
  const distinctSeasons = new Set(data.seasons.map((s) => s.season)).size
  const summary = [
    { label: 'Sezon', value: distinctSeasons },
    { label: 'Maç', value: totals.apps },
    { label: 'Gol', value: totals.goals, accent: true },
    { label: 'Asist', value: totals.assists },
  ]

  const isFormer = data.currentTeamSeason != null && data.currentTeamSeason < CURRENT_SEASON

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
            size={104}
            className="ring-2 ring-brand-500/40"
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-100">{data.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {facts.map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-wide text-ink-500">{f.label}</div>
                  <div className="text-sm font-medium text-ink-100">{f.value}</div>
                </div>
              ))}
            </div>
            {data.currentTeamName && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  to={data.currentTeamId ? `/teams/${data.currentTeamId}` : '#'}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-950/40 px-2.5 py-1 text-xs font-medium text-ink-200 transition hover:text-brand-300"
                >
                  {data.currentTeamApiId != null && <TeamLogo apiId={data.currentTeamApiId} size={16} />}
                  {data.currentTeamName}
                  {isFormer && data.currentTeamSeason != null && (
                    <span className="text-ink-400">· {seasonLabel(data.currentTeamSeason)}</span>
                  )}
                </Link>
                {isFormer && (
                  <span className="rounded-full bg-ink-950/40 px-2 py-0.5 text-[11px] text-ink-400">
                    Güncel kadroda değil
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Career totals */}
      <div className="grid grid-cols-4 gap-3">
        {summary.map((s) => (
          <Card key={s.label}>
            <div className="px-3 py-4 text-center">
              <div
                className={`score-num text-2xl font-extrabold tabular-nums sm:text-3xl ${
                  s.accent ? 'text-brand-300' : 'text-ink-100'
                }`}
              >
                {s.value}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Season-by-season history */}
      <Card className="overflow-hidden">
        <div className="section-label px-4 pt-3 text-ink-400">Kariyer · sezon sezon</div>
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
