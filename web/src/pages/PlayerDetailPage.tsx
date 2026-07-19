import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Shirt, Sparkles, Target } from 'lucide-react'
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
    { label: 'Sezon', value: distinctSeasons, Icon: CalendarDays, grad: 'from-violet-400 to-purple-600' },
    { label: 'Maç', value: totals.apps, Icon: Shirt, grad: 'from-sky-400 to-blue-600' },
    { label: 'Gol', value: totals.goals, Icon: Target, grad: 'from-brand-400 to-emerald-600' },
    { label: 'Asist', value: totals.assists, Icon: Sparkles, grad: 'from-amber-300 to-orange-500' },
  ]
  // Peak-goals season, highlighted in the career table.
  const peakGoals = Math.max(0, ...data.seasons.map((s) => s.goals ?? 0))

  const isFormer = data.currentTeamSeason != null && data.currentTeamSeason < CURRENT_SEASON

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(120% 85% at 85% -15%, rgba(194,245,66,0.18), transparent 55%)',
          }}
        />
        {/* A big translucent flag disc anchors the hero and adds a splash of the
            player's nationality colour instead of a flat green field. */}
        {data.nationality && (
          <div className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 select-none text-[9rem] leading-none opacity-15 blur-[1px] sm:block">
            {flagEmoji(data.nationality)}
          </div>
        )}
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-950/40 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition hover:text-brand-300"
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

      {/* Career totals — a distinct colour + icon per stat, so the row reads at a glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-3.5 sm:px-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} shadow-lg shadow-black/30 ring-1 ring-white/10`}
              >
                <s.Icon className="h-5 w-5 text-white drop-shadow" />
              </div>
              <div className="min-w-0">
                <div className="score-num text-2xl font-extrabold leading-none tabular-nums text-ink-50 sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-500">{s.label}</div>
              </div>
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
              <SeasonRow
                key={`${s.leagueId}-${s.season}`}
                s={s}
                peak={peakGoals > 0 && (s.goals ?? 0) === peakGoals}
              />
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function SeasonRow({ s, peak }: { s: PlayerSeason; peak?: boolean }) {
  return (
    <Tr className={peak ? 'bg-brand-500/[0.07]' : undefined}>
      <Td className="whitespace-nowrap text-ink-300">
        <Link to={`/leagues/${s.leagueId}`} className="flex items-center gap-1.5 hover:text-brand-300">
          {peak && <span className="text-amber-300" title="En golcü sezonu">★</span>}
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
      <Td className={`text-center font-bold ${peak ? 'text-brand-300' : 'text-ink-100'}`}>{s.goals ?? 0}</Td>
      <Td className="text-center font-semibold text-ink-100">{s.assists ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.yellowCards ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.redCards ?? 0}</Td>
      <Td className="hidden text-center md:table-cell">
        {s.rating != null ? <span className="font-medium text-brand-300">{s.rating.toFixed(2)}</span> : '—'}
      </Td>
    </Tr>
  )
}
