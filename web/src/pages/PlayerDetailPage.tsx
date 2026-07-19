import { Link, useParams } from 'react-router-dom'
import { usePlayer } from '@/features/football/hooks'
import type { PlayerSeason } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'

// The current campaign; a current-club row older than this means the player left.
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

  // Inline identity facts.
  const facts = [
    data.nationality && `${flagEmoji(data.nationality)} ${data.nationality}`.trim(),
    data.position,
    data.age != null && `${data.age} yaş`,
    data.height,
  ].filter(Boolean) as string[]

  // THIS SEASON only — summed across the competitions the player featured in this
  // campaign (league + cups + Europe). This is the headline, not career totals.
  const current = data.seasons.filter((s) => s.season === CURRENT_SEASON)
  const cur = current.reduce(
    (a, s) => ({
      apps: a.apps + (s.appearances ?? 0),
      goals: a.goals + (s.goals ?? 0),
      assists: a.assists + (s.assists ?? 0),
      minutes: a.minutes + (s.minutes ?? 0),
    }),
    { apps: 0, goals: 0, assists: 0, minutes: 0 },
  )
  const ratings = current.map((s) => s.rating).filter((r): r is number => r != null)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const playedThisSeason = current.length > 0 && cur.apps > 0
  const curTeam = current.find((s) => s.teamName)?.teamName

  const isFormer = data.currentTeamSeason != null && data.currentTeamSeason < CURRENT_SEASON

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header — clean, no heavy gradient. */}
      <div className="flex flex-wrap items-center gap-5">
        <PlayerAvatar
          playerApiId={data.playerApiId}
          name={data.name}
          size={88}
          className="ring-1 ring-ink-800"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">{data.name}</h1>
          {facts.length > 0 && (
            <p className="mt-1 text-sm text-ink-400">{facts.join(' · ')}</p>
          )}
          {data.currentTeamName && (
            <Link
              to={data.currentTeamId ? `/teams/${data.currentTeamId}` : '#'}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-200 transition hover:text-brand-500"
            >
              {data.currentTeamApiId != null && <TeamLogo apiId={data.currentTeamApiId} size={18} />}
              {data.currentTeamName}
              {isFormer && data.currentTeamSeason != null && (
                <span className="text-ink-400">· {seasonLabel(data.currentTeamSeason)} (ayrıldı)</span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* THIS SEASON — the headline stats. */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
          Bu sezon · {seasonLabel(CURRENT_SEASON)}
        </h2>
        {playedThisSeason ? (
          <>
            <Card className="grid grid-cols-4 divide-x divide-ink-800">
              <Stat label="Maç" value={cur.apps} />
              <Stat label="Gol" value={cur.goals} accent />
              <Stat label="Asist" value={cur.assists} />
              <Stat label="Reyting" value={avgRating != null ? avgRating.toFixed(1) : '—'} />
            </Card>
            {curTeam && (
              <p className="mt-2 text-xs text-ink-500">
                {curTeam} · {cur.minutes.toLocaleString('tr-TR')} dk
              </p>
            )}
          </>
        ) : (
          <Card>
            <p className="px-4 py-8 text-center text-sm text-ink-500">
              Bu sezon için istatistik yok — aşağıda kariyer geçmişi var.
            </p>
          </Card>
        )}
      </section>

      {/* Season-by-season history — secondary. */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
          Kariyer geçmişi
        </h2>
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Sezon</Th>
                <Th>Takım</Th>
                <Th className="text-center">Maç</Th>
                <Th className="text-center">Gol</Th>
                <Th className="text-center">Asist</Th>
                <Th className="hidden text-center sm:table-cell">Dk</Th>
                <Th className="hidden text-center md:table-cell">Reyting</Th>
              </tr>
            </thead>
            <tbody>
              {data.seasons.map((s) => (
                <SeasonRow
                  key={`${s.leagueId}-${s.season}`}
                  s={s}
                  current={s.season === CURRENT_SEASON}
                />
              ))}
            </tbody>
          </Table>
        </Card>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="px-3 py-4 text-center">
      <div
        className={cn(
          'score-num text-3xl font-extrabold tabular-nums',
          accent ? 'text-brand-500' : 'text-ink-100',
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
    </div>
  )
}

function SeasonRow({ s, current }: { s: PlayerSeason; current?: boolean }) {
  return (
    <Tr className={current ? 'bg-brand-500/[0.06]' : undefined}>
      <Td className="whitespace-nowrap text-ink-300">
        <Link to={`/leagues/${s.leagueId}`} className="flex items-center gap-1.5 hover:text-brand-500">
          <TeamLogo apiId={s.leagueApiId} kind="league" size={16} />
          {seasonLabel(s.season)}
        </Link>
      </Td>
      <Td>
        <Link
          to={s.teamId ? `/teams/${s.teamId}` : '#'}
          className="flex items-center gap-2 hover:text-brand-500"
        >
          {s.teamApiId != null && <TeamLogo apiId={s.teamApiId} size={18} />}
          <span className="truncate text-ink-100">{s.teamName ?? '—'}</span>
        </Link>
      </Td>
      <Td className="text-center text-ink-300">{s.appearances ?? '—'}</Td>
      <Td className="text-center font-bold text-ink-100">{s.goals ?? 0}</Td>
      <Td className="text-center font-semibold text-ink-100">{s.assists ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.minutes ?? '—'}</Td>
      <Td className="hidden text-center md:table-cell">
        {s.rating != null ? <span className="font-medium text-brand-500">{s.rating.toFixed(2)}</span> : '—'}
      </Td>
    </Tr>
  )
}
