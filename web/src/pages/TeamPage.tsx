import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Trophy } from 'lucide-react'
import { useTeam } from '@/features/football/hooks'
import { FixtureList } from '@/features/football/FixtureList'
import { FormBadges } from '@/features/football/FormBadges'
import { isFinished } from '@/features/football/matchStatus'
import {
  wonTrophies,
  TrophyImage,
  leagueForCountry,
  type WonTrophy,
} from '@/features/football/trophyAssets'
import type { Fixture, SquadPlayer, Team, TeamStanding } from '@/features/football/types'
import { TeamLogo } from '@/components/TeamLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

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

  const { team, fixtures, standings, squad, trophies, trophyYears } = data
  const location = [team.stadiumName, team.city].filter(Boolean).join(' · ')
  // Anchor to the CURRENT season (newest we hold); it fills in as matches are
  // played. Older seasons live in the players' career tables.
  const primary = standings[0]
  // Which of the six leagues the club plays in — picks its league-title and
  // national-cup trophy images/names. Country is the reliable source; standings
  // can miss the domestic row, which would fall back to a generic label.
  const domesticLeagueId =
    leagueForCountry(team.country) ??
    standings.find((s) => [39, 140, 78, 135, 61, 203].includes(s.leagueApiId))?.leagueApiId
  const won = wonTrophies(trophies, domesticLeagueId, trophyYears)
  const trophyTotal = won.reduce((sum, it) => sum + it.count, 0)
  const squadSeason = squad[0]?.season
  const recent = fixtures.filter((f) => isFinished(f.status)).reverse()
  const upcoming = fixtures.filter((f) => !isFinished(f.status))

  return (
    <div className="space-y-6">
      {/* Hero — the stadium photo as a blurred, darkened backdrop, with the crest
          + identity on the left and the club's trophies right beside it. */}
      <section className="relative overflow-hidden rounded-card border border-ink-800 bg-ink-950">
        {team.venueImage ? (
          <img
            src={team.venueImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-md brightness-[0.5]"
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
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/92 via-ink-950/65 to-ink-950/40" />
        <div className="relative flex flex-col gap-5 p-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <div className="shrink-0 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur-sm sm:p-4">
              <TeamLogo apiId={team.apiFootballId} size={88} className="drop-shadow-2xl" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink-100 drop-shadow-lg break-words sm:text-4xl">
                {team.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-200">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-brand-300" /> {location}
                  </span>
                )}
                {team.founded && <span>Kuruluş {team.founded}</span>}
                {primary && (
                  <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-ink-950">
                    {primary.leagueName}
                    {primary.played > 0
                      ? ` · ${primary.position}. sıra`
                      : ` · ${seasonLabel(primary.season)}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {won.length > 0 && <TrophyShelf won={won} total={trophyTotal} teamId={team.id} />}
        </div>
      </section>

      {primary && <StandingCard s={primary} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {squad.filter((p) => (p.goals ?? 0) > 0).length > 0 && (
            <TeamStars squad={squad.filter((p) => (p.goals ?? 0) > 0).slice(0, 3)} season={squadSeason} />
          )}
          <TeamMatches upcoming={upcoming} recent={recent} leagueId={primary?.leagueId} />
        </div>

        <aside className="space-y-6">
          <TeamInfoCard team={team} />

          <Card className="overflow-hidden">
            <CardHeader
              title={`Kadro${squadSeason ? ` · ${seasonLabel(squadSeason)}` : ''}${squad.length ? ` · ${squad.length}` : ''}`}
              action={
                <Link
                  to={`/teams/${team.id}/squad`}
                  className="text-xs font-medium text-brand-300 hover:underline"
                >
                  Detaylı kadro →
                </Link>
              }
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

// A compact, prominent trophy shelf shown right in the team header: the club's
// most prestigious honours as big photos, linking to the full cabinet page.
function TrophyShelf({ won, total, teamId }: { won: WonTrophy[]; total: number; teamId: number }) {
  const top = won.slice(0, 4)
  return (
    <Link
      to={`/teams/${teamId}/trophies`}
      className="group shrink-0 rounded-2xl border border-amber-400/25 bg-ink-950/55 p-3 pt-2.5 ring-1 ring-white/5 backdrop-blur-md transition hover:border-amber-400/55 hover:bg-ink-950/70"
    >
      <div className="mb-2 flex items-center justify-between gap-4 px-1">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-300">
          <Trophy className="h-3.5 w-3.5" /> {total} Kupa
        </span>
        <span className="text-[11px] font-semibold text-ink-400 transition group-hover:text-amber-300">
          Tümü &rarr;
        </span>
      </div>
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {top.map((it) => (
          <div key={it.key} className="flex w-[68px] flex-col items-center gap-1.5" title={it.label}>
            <div className="flex h-[72px] w-full items-end justify-center">
              <TrophyImage src={it.img} label={it.label} />
            </div>
            <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-black tabular-nums text-amber-950 shadow">
              &times;{it.count}
            </span>
          </div>
        ))}
      </div>
    </Link>
  )
}

// Upcoming + recent matches in ONE compact card with a small toggle, so the two
// fixture lists don't dominate the page (they used to be two tall stacked cards).
function TeamMatches({
  upcoming,
  recent,
  leagueId,
}: {
  upcoming: Fixture[]
  recent: Fixture[]
  leagueId?: number
}) {
  const [tab, setTab] = useState<'upcoming' | 'recent'>(upcoming.length > 0 ? 'upcoming' : 'recent')
  if (upcoming.length === 0 && recent.length === 0) {
    return (
      <Card>
        <CardBody className="py-8">
          <EmptyState title="Maç bulunamadı" />
        </CardBody>
      </Card>
    )
  }
  const list = (tab === 'upcoming' ? upcoming : recent).slice(0, 5)
  const btn = (active: boolean) =>
    cn(
      'rounded-md px-3 py-2 text-xs font-semibold transition',
      active ? 'bg-ink-700 text-ink-100 shadow-sm' : 'text-ink-400 hover:text-ink-200',
    )
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-3 py-2.5">
        <div className="flex gap-0.5 rounded-lg bg-ink-850 p-0.5">
          {upcoming.length > 0 && (
            <button className={btn(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
              Yaklaşan
            </button>
          )}
          {recent.length > 0 && (
            <button className={btn(tab === 'recent')} onClick={() => setTab('recent')}>
              Son sonuçlar
            </button>
          )}
        </div>
        {leagueId && (
          <Link
            to={`/leagues/${leagueId}`}
            className="px-1 text-xs font-medium text-brand-300 hover:underline"
          >
            Tüm fikstür →
          </Link>
        )}
      </div>
      {list.length > 0 ? (
        <FixtureList fixtures={list} showLeague />
      ) : (
        <p className="py-6 text-center text-sm text-ink-500">Kayıt yok.</p>
      )}
    </Card>
  )
}

// Gold / silver / bronze podium tints for the top three scorers.
const MEDAL_CARD = [
  'from-amber-400/[0.14] to-ink-900 ring-amber-400/35',
  'from-slate-300/[0.10] to-ink-900 ring-slate-300/25',
  'from-orange-500/[0.10] to-ink-900 ring-orange-500/25',
]
const MEDAL_NUM = ['text-amber-300', 'text-slate-200', 'text-orange-300']

function TeamStars({ squad, season }: { squad: SquadPlayer[]; season?: number }) {
  return (
    <Card>
      <CardHeader
        title={`Takımın golcüleri${season ? ` · ${seasonLabel(season)}` : ''}`}
        action={<Trophy className="h-4 w-4 text-amber-400" />}
      />
      <CardBody>
        <div className="grid grid-cols-3 items-end gap-3">
          {squad.map((p, i) => (
            <Link
              key={p.playerApiId}
              to={`/players/${p.playerApiId}`}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border border-ink-800 bg-gradient-to-b px-2 py-3 text-center ring-1 transition hover:brightness-125 ${
                MEDAL_CARD[i] ?? 'from-ink-850 to-ink-900 ring-transparent'
              }`}
            >
              <span className="absolute left-2 top-1.5 text-[11px] font-black tabular-nums text-ink-600">
                {i + 1}
              </span>
              <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={i === 0 ? 66 : 52} />
              <div className="mt-0.5 truncate text-xs font-medium text-ink-100">{p.name}</div>
              <div className={`score-num text-2xl font-extrabold ${MEDAL_NUM[i] ?? 'text-brand-300'}`}>
                {p.goals ?? 0}
              </div>
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
  if (rows.length === 0 && !team.venueImage) return null
  return (
    <Card className="overflow-hidden">
      {team.venueImage && (
        <div className="relative h-40 w-full">
          <img
            src={team.venueImage}
            alt={team.stadiumName ?? ''}
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900 via-ink-900/60 to-transparent px-3 pb-2 pt-8">
            {team.stadiumName && (
              <span className="text-sm font-semibold text-ink-100 drop-shadow">{team.stadiumName}</span>
            )}
          </div>
        </div>
      )}
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
    { label: 'G', value: String(s.won), tone: 'text-emerald-400' },
    { label: 'B', value: String(s.drawn), tone: 'text-ink-300' },
    { label: 'M', value: String(s.lost), tone: 'text-rose-400' },
    {
      label: 'AV',
      value: diff > 0 ? `+${diff}` : String(diff),
      tone: diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-ink-300',
    },
    { label: 'P', value: String(s.points), tone: 'text-amber-300' },
  ]
  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-center gap-2">
          <TeamLogo apiId={s.leagueApiId} kind="league" size={18} />
          <span className="text-sm font-semibold text-ink-100">{s.leagueName}</span>
          <span className="text-xs text-ink-500">{seasonLabel(s.season)}</span>
          {s.form && (
            <div className="ml-auto">
              <FormBadges form={s.form} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {cols.map((c) => (
            <div key={c.label} className="rounded-xl bg-ink-850 py-2.5">
              <div className={`score-num text-xl font-extrabold ${c.tone ?? 'text-ink-100'}`}>{c.value}</div>
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
