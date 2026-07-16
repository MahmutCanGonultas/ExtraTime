import { Link, useParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useTeam } from '@/features/football/hooks'
import { FixtureList } from '@/features/football/FixtureList'
import { FormBadges } from '@/features/football/FormBadges'
import { isFinished } from '@/features/football/matchStatus'
import type { SquadPlayer, Team, TeamStanding } from '@/features/football/types'
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
  // Anchor to the CURRENT season (newest we hold); it fills in as matches are
  // played. Older seasons live in the players' career tables.
  const primary = standings[0]
  const squadSeason = squad[0]?.season
  const recent = fixtures.filter((f) => isFinished(f.status)).reverse()
  const upcoming = fixtures.filter((f) => !isFinished(f.status))

  return (
    <div className="space-y-5">
      {/* Hero — the stadium photo as a big backdrop */}
      <section className="relative min-h-[240px] overflow-hidden rounded-card border border-ink-800">
        {team.venueImage ? (
          <img
            src={team.venueImage}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover object-center"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
            />
            <div className="absolute inset-0 mow-stripes" />
            <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
          </>
        )}
        {/* Bottom-weighted scrim: readable text, but the stadium stays clear */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-ink-950/5" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950/85 to-transparent" />
        <div className="relative flex min-h-[240px] flex-wrap items-end gap-4 p-6 sm:p-8">
          <TeamLogo apiId={team.apiFootballId} size={76} className="drop-shadow-2xl" />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-4xl">
              {team.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-200">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-brand-300" /> {location}
                </span>
              )}
              {team.founded && <span>Kuruluş {team.founded}</span>}
              {primary && (
                <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-ink-950">
                  {primary.leagueName}
                  {primary.played > 0 ? ` · ${primary.position}. sıra` : ` · ${seasonLabel(primary.season)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {primary && <StandingCard s={primary} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {squad.filter((p) => (p.goals ?? 0) > 0).length > 0 && (
            <TeamStars squad={squad.filter((p) => (p.goals ?? 0) > 0).slice(0, 3)} season={squadSeason} />
          )}
          {upcoming.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader
                title="Yaklaşan maçlar"
                action={
                  primary && (
                    <Link
                      to={`/leagues/${primary.leagueId}`}
                      className="text-xs font-medium text-brand-300 hover:underline"
                    >
                      Tüm fikstür →
                    </Link>
                  )
                }
              />
              <FixtureList fixtures={upcoming.slice(0, 5)} showLeague />
            </Card>
          )}
          {recent.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Son sonuçlar" />
              <FixtureList fixtures={recent.slice(0, 5)} showLeague />
            </Card>
          )}
          {fixtures.length === 0 && (
            <Card>
              <EmptyState title="Maç bulunamadı" />
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <TeamInfoCard team={team} />

          <Card className="overflow-hidden">
            <CardHeader
              title={`Kadro${squadSeason ? ` · ${seasonLabel(squadSeason)}` : ''}${squad.length ? ` · ${squad.length}` : ''}`}
            />
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

function TeamStars({ squad, season }: { squad: SquadPlayer[]; season?: number }) {
  return (
    <Card>
      <CardHeader title={`Takımın golcüleri${season ? ` · ${seasonLabel(season)}` : ''}`} />
      <CardBody>
        <div className="grid grid-cols-3 gap-3">
          {squad.map((p) => (
            <Link
              key={p.playerApiId}
              to={`/players/${p.playerApiId}`}
              className="flex flex-col items-center gap-1.5 rounded-lg bg-ink-850 px-2 py-3 text-center transition hover:bg-ink-800"
            >
              <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={56} />
              <div className="mt-0.5 truncate text-xs font-medium text-ink-100">{p.name}</div>
              <div className="score-num text-2xl font-extrabold text-brand-300">{p.goals ?? 0}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-500">gol</div>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function TeamInfoCard({ team }: { team: Team }) {
  const rows = [
    team.country && { label: 'Ülke', value: team.country },
    team.founded && { label: 'Kuruluş', value: String(team.founded) },
    team.stadiumName && { label: 'Stadyum', value: team.stadiumName },
    team.city && { label: 'Şehir', value: team.city },
    team.venueCapacity && { label: 'Kapasite', value: team.venueCapacity.toLocaleString('tr-TR') },
  ].filter(Boolean) as Array<{ label: string; value: string }>
  if (rows.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Künye" />
      <ul className="px-2 py-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
            <span className="shrink-0 text-ink-400">{r.label}</span>
            <span className="truncate text-right font-medium text-ink-100">{r.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function StandingCard({ s }: { s: TeamStanding }) {
  if (s.played === 0) {
    return (
      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <TeamLogo apiId={s.leagueApiId} kind="league" size={18} />
          <span className="text-sm font-semibold text-ink-100">{s.leagueName}</span>
          <span className="text-xs text-ink-500">{seasonLabel(s.season)}</span>
          <span className="ml-auto text-xs text-ink-400">
            Sezon başlamadı — maçlar oynandıkça güncellenecek
          </span>
        </CardBody>
      </Card>
    )
  }
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
