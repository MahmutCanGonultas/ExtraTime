import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTeamSquad } from '@/features/football/hooks'
import type { SquadPlayer } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'

function seasonLabel(s: number): string {
  const n = (s + 1) % 100
  return `${s}/${n.toString().padStart(2, '0')}`
}

type Accent = 'amber' | 'sky' | 'brand' | 'rose' | 'ink'

const POSITION_GROUPS: { key: string; label: string; accent: Accent }[] = [
  { key: 'Goalkeeper', label: 'Kaleciler', accent: 'amber' },
  { key: 'Defender', label: 'Defans', accent: 'sky' },
  { key: 'Midfielder', label: 'Orta Saha', accent: 'brand' },
  { key: 'Attacker', label: 'Forvetler', accent: 'rose' },
]

const ACCENT_BAR: Record<Accent, string> = {
  amber: 'bg-amber-400',
  sky: 'bg-sky-400',
  brand: 'bg-brand-400',
  rose: 'bg-rose-400',
  ink: 'bg-ink-600',
}

export function SquadPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const [season, setSeason] = useState<number | undefined>(undefined)
  const { data, isLoading, isError, refetch } = useTeamSquad(teamId, season)

  if (isLoading) return <Skeleton className="h-96" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Kadro bulunamadı" />

  const squad = data.squad
  const groups = POSITION_GROUPS.map((g) => ({
    ...g,
    players: squad.filter((p) => p.position === g.key),
  }))
  const other = squad.filter((p) => !POSITION_GROUPS.some((g) => g.key === p.position))
  if (other.length) groups.push({ key: 'other', label: 'Diğer', accent: 'ink', players: other })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/teams/${teamId}`} className="flex items-center gap-3 transition hover:text-brand-300">
          <TeamLogo apiId={data.team.apiFootballId} size={48} />
          <div>
            <h1 className="text-2xl font-bold text-ink-100">{data.team.name}</h1>
            <p className="text-sm text-ink-400">
              Kadro{data.season ? ` · ${seasonLabel(data.season)}` : ''} · {squad.length} oyuncu
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

      {squad.length === 0 ? (
        <Card>
          <EmptyState title="Bu sezon için kadro verisi yok" />
        </Card>
      ) : (
        groups
          .filter((g) => g.players.length > 0)
          .map((g) => (
            <section key={g.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn('h-4 w-1 rounded-full', ACCENT_BAR[g.accent])} />
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-200">{g.label}</h2>
                <span className="text-xs font-medium text-ink-500">{g.players.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.players.map((p) => (
                  <PlayerCard key={p.playerApiId} p={p} />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  )
}

function PlayerCard({ p }: { p: SquadPlayer }) {
  const flag = flagEmoji(p.nationality)
  return (
    <Link
      to={`/players/${p.playerApiId}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-950 p-3 transition hover:border-ink-600 hover:shadow-lg hover:shadow-ink-950/50"
    >
      {p.jerseyNumber != null && (
        <span className="absolute right-2.5 top-1.5 text-2xl font-black tabular-nums text-ink-800 transition group-hover:text-ink-700">
          {p.jerseyNumber}
        </span>
      )}
      <div className="relative shrink-0">
        <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={56} />
        {flag && (
          <span className="absolute -bottom-1 -right-1 rounded-sm bg-ink-950/70 text-base leading-none">
            {flag}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate pr-6 font-semibold text-ink-100 transition group-hover:text-brand-300">
          {p.name}
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-400">
          {p.nationality ?? '—'}
          {p.age != null && ` · ${p.age} yaş`}
        </div>
        <div className="mt-2 flex gap-3">
          <StatCell label="Maç" value={p.appearances ?? 0} />
          <StatCell label="Gol" value={p.goals ?? 0} accent />
          <StatCell label="Asist" value={p.assists ?? 0} />
          {p.rating != null && <StatCell label="Reyting" value={p.rating.toFixed(1)} />}
        </div>
      </div>
    </Link>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className={cn('text-sm font-bold tabular-nums', accent ? 'text-brand-300' : 'text-ink-100')}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-ink-500">{label}</span>
    </div>
  )
}
