import { Link, useParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useTeam } from '@/features/football/hooks'
import { FixtureList } from '@/features/football/FixtureList'
import { FormBadges } from '@/features/football/FormBadges'
import { isFinished } from '@/features/football/matchStatus'
import type { SquadPlayer, TeamStanding } from '@/features/football/types'
import { TeamLogo } from '@/components/TeamLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

export function TeamPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const { data, isLoading, isError, refetch } = useTeam(teamId)

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Takım bulunamadı" />

  const { team, fixtures, standings, squad } = data
  const location = [team.stadiumName, team.city].filter(Boolean).join(' · ')
  const primary = standings.find((s) => s.played > 0) ?? standings[0]
  const recent = fixtures.filter((f) => isFinished(f.status)).reverse()
  const upcoming = fixtures.filter((f) => !isFinished(f.status))

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <div className="relative flex flex-wrap items-center gap-4 px-6 py-7 sm:px-8">
          <TeamLogo apiId={team.apiFootballId} size={72} className="drop-shadow-lg" />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-100">{team.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-300">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-brand-300" /> {location}
                </span>
              )}
              {primary && (
                <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-300">
                  {primary.leagueName} · {primary.position}. sıra
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {primary && <StandingCard s={primary} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {upcoming.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Yaklaşan maçlar" />
              <FixtureList fixtures={upcoming} showLeague />
            </Card>
          )}
          {recent.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Son sonuçlar" />
              <FixtureList fixtures={recent} showLeague />
            </Card>
          )}
          {fixtures.length === 0 && (
            <Card>
              <EmptyState title="Maç bulunamadı" />
            </Card>
          )}
        </div>

        <aside>
          <Card className="overflow-hidden">
            <CardHeader title={`Kadro${squad.length ? ` · ${squad.length}` : ''}`} />
            {squad.length === 0 ? (
              <CardBody className="py-6 text-center text-sm text-ink-500">Kadro verisi yok.</CardBody>
            ) : (
              <ul className="max-h-[560px] divide-y divide-ink-850 overflow-y-auto">
                {squad.map((p) => (
                  <SquadRow key={p.playerApiId} p={p} />
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}

function StandingCard({ s }: { s: TeamStanding }) {
  const diff = s.goalsFor - s.goalsAgainst
  const cols: Array<{ label: string; value: string; tone?: string }> = [
    { label: 'Sıra', value: `${s.position}.`, tone: 'text-brand-300' },
    { label: 'O', value: String(s.played) },
    { label: 'G', value: String(s.won) },
    { label: 'B', value: String(s.drawn) },
    { label: 'M', value: String(s.lost) },
    { label: 'AV', value: diff > 0 ? `+${diff}` : String(diff) },
    { label: 'P', value: String(s.points), tone: 'text-ink-100' },
  ]
  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <TeamLogo apiId={s.leagueApiId} kind="league" size={18} />
          <span className="text-sm font-semibold text-ink-100">{s.leagueName}</span>
          <span className="text-xs text-ink-500">{seasonLabel(s.season)}</span>
          {s.form && (
            <div className="ml-auto">
              <FormBadges form={s.form} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1 rounded-xl bg-ink-850 p-3 text-center">
          {cols.map((c) => (
            <div key={c.label}>
              <div className={`score-num text-xl font-extrabold ${c.tone ?? 'text-ink-200'}`}>{c.value}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">{c.label}</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function SquadRow({ p }: { p: SquadPlayer }) {
  return (
    <li>
      <Link to={`/players/${p.playerApiId}`} className="flex items-center gap-2.5 px-4 py-2 transition hover:bg-ink-850">
        <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-ink-100">{p.name}</div>
          <div className="truncate text-[11px] text-ink-500">{p.position ?? '—'}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <span className="text-ink-400" title="Gol">
            <span className="score-num font-bold text-ink-100">{p.goals ?? 0}</span> G
          </span>
          <span className="text-ink-400" title="Asist">
            <span className="score-num font-bold text-ink-100">{p.assists ?? 0}</span> A
          </span>
        </div>
      </Link>
    </li>
  )
}
