import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Trophy } from 'lucide-react'
import { useTeam } from '@/features/football/hooks'
import { FixtureList } from '@/features/football/FixtureList'
import { FormBadges } from '@/features/football/FormBadges'
import { isFinished } from '@/features/football/matchStatus'
import type { SquadPlayer, Team, TeamHonours, TeamHonourYears, TeamStanding } from '@/features/football/types'
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

  const { team, fixtures, standings, squad, trophies, trophyYears } = data
  const location = [team.stadiumName, team.city].filter(Boolean).join(' · ')
  // Anchor to the CURRENT season (newest we hold); it fills in as matches are
  // played. Older seasons live in the players' career tables.
  const primary = standings[0]
  // Which of the six leagues the club plays in — picks its league-title and
  // national-cup trophy images.
  const domesticLeagueId = standings.find((s) =>
    [39, 140, 78, 135, 61, 203].includes(s.leagueApiId),
  )?.leagueApiId
  const squadSeason = squad[0]?.season
  const recent = fixtures.filter((f) => isFinished(f.status)).reverse()
  const upcoming = fixtures.filter((f) => !isFinished(f.status))

  return (
    <div className="space-y-5">
      {/* Hero — the stadium photo as a blurred, darkened backdrop that fills the
          whole banner, with the team crest big and framed in front. */}
      <section className="relative h-52 overflow-hidden rounded-card border border-ink-800 bg-ink-950 sm:h-60">
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
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/55 to-ink-950/25" />
        <div className="absolute inset-0 flex items-center gap-5 p-6 sm:gap-7 sm:px-10">
          <div className="shrink-0 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur-sm sm:p-4">
            <TeamLogo apiId={team.apiFootballId} size={88} className="drop-shadow-2xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-4xl">
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
                  {primary.played > 0 ? ` · ${primary.position}. sıra` : ` · ${seasonLabel(primary.season)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <TrophyCabinet trophies={trophies} leagueApiId={domesticLeagueId} years={trophyYears} />

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

// Real trophy photos in /public/trophies. The league-title and national-cup image
// depend on which of the six leagues the club plays in; the European/world ones
// are fixed. (jpg or png per source.)
const TROPHY_IMG: Record<string, string> = {
  'champions-league': '/trophies/champions-league.png',
  'europa-league': '/trophies/europa-league.png',
  'conference-league': '/trophies/conference-league.png',
  'super-cup': '/trophies/super-cup.png',
  'club-world-cup': '/trophies/club-world-cup.png',
  'cup-winners-cup': '/trophies/cup-winners-cup.png',
  'la-liga': '/trophies/la-liga.png',
  'premier-league': '/trophies/premier-league.png',
  bundesliga: '/trophies/bundesliga.png',
  'serie-a': '/trophies/serie-a.png',
  'ligue-1': '/trophies/ligue-1.png',
  'super-lig': '/trophies/super-lig.png',
  'copa-del-rey': '/trophies/copa-del-rey.png',
  'fa-cup': '/trophies/fa-cup.png',
  'dfb-pokal': '/trophies/dfb-pokal.png',
  'coppa-italia': '/trophies/coppa-italia.png',
  'coupe-de-france': '/trophies/coupe-de-france.png',
  'turkiye-kupasi': '/trophies/turkiye-kupasi.png',
}
const LEAGUE_TROPHY: Record<number, { league: string; cup: string }> = {
  39: { league: 'premier-league', cup: 'fa-cup' },
  140: { league: 'la-liga', cup: 'copa-del-rey' },
  78: { league: 'bundesliga', cup: 'dfb-pokal' },
  135: { league: 'serie-a', cup: 'coppa-italia' },
  61: { league: 'ligue-1', cup: 'coupe-de-france' },
  203: { league: 'super-lig', cup: 'turkiye-kupasi' },
}
const CONTINENTAL_SLUG: Partial<Record<keyof TeamHonours, string>> = {
  championsLeague: 'champions-league',
  europaLeague: 'europa-league',
  conferenceLeague: 'conference-league',
  cupWinnersCup: 'cup-winners-cup',
  uefaSuperCup: 'super-cup',
  clubWorldCup: 'club-world-cup',
}
// Order shown, most prestigious first.
const HONOUR_ORDER: Array<{ key: keyof TeamHonours; label: string }> = [
  { key: 'leagueTitles', label: 'Lig Şampiyonluğu' },
  { key: 'championsLeague', label: 'Şampiyonlar Ligi' },
  { key: 'domesticCups', label: 'Ülke Kupası' },
  { key: 'europaLeague', label: 'UEFA Avrupa Ligi' },
  { key: 'clubWorldCup', label: 'Dünya Kulüpler Kupası' },
  { key: 'conferenceLeague', label: 'Konferans Ligi' },
  { key: 'cupWinnersCup', label: 'Kupa Galipleri Kupası' },
  { key: 'uefaSuperCup', label: 'UEFA Süper Kupa' },
]

function honourSlug(key: keyof TeamHonours, leagueApiId?: number): string | undefined {
  if (key === 'leagueTitles') return leagueApiId ? LEAGUE_TROPHY[leagueApiId]?.league : undefined
  if (key === 'domesticCups') return leagueApiId ? LEAGUE_TROPHY[leagueApiId]?.cup : undefined
  return CONTINENTAL_SLUG[key]
}

// The trophy photo, falling back to a trophy icon if the image is missing/broken.
function TrophyImage({ src, label }: { src?: string; label: string }) {
  const [failed, setFailed] = useState(!src)
  if (failed || !src) return <Trophy className="h-14 w-14 text-amber-400/70" />
  return (
    <img
      src={src}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
      className="max-h-[108px] max-w-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
    />
  )
}

function TrophyCabinet({
  trophies,
  leagueApiId,
  years,
}: {
  trophies: TeamHonours | null
  leagueApiId?: number
  years?: TeamHonourYears | null
}) {
  const [detailed, setDetailed] = useState(false)
  if (!trophies) return null
  const won = HONOUR_ORDER.map((it) => ({
    ...it,
    count: trophies[it.key],
    slug: honourSlug(it.key, leagueApiId),
    years: years?.[it.key] ?? [],
  })).filter((it) => it.count > 0)
  if (won.length === 0) return null
  const total = won.reduce((sum, it) => sum + it.count, 0)
  const hasYears = won.some((it) => it.years.length > 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Kupa Dolabı"
        action={
          <div className="flex items-center gap-2">
            {hasYears && (
              <button
                onClick={() => setDetailed((d) => !d)}
                className="rounded-full border border-ink-700 px-2.5 py-1 text-xs font-semibold text-ink-300 transition hover:border-brand-500 hover:text-brand-300"
              >
                {detailed ? 'Basit' : 'Detaylı'}
              </button>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-300">
              <Trophy className="h-3.5 w-3.5" /> {total} kupa
            </span>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {won.map((it) => (
            <div
              key={it.key}
              className="relative flex flex-col items-center gap-2.5 rounded-2xl border border-ink-800 bg-gradient-to-b from-ink-800/50 to-ink-950 p-3 pt-4 text-center"
            >
              <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black tabular-nums text-ink-950 shadow-md">
                ×{it.count}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <TrophyImage src={it.slug ? TROPHY_IMG[it.slug] : undefined} label={it.label} />
              </div>
              <div className="text-[11px] font-medium leading-tight text-ink-300">{it.label}</div>
              {detailed && it.years.length > 0 && (
                <div className="mt-0.5 max-h-24 overflow-y-auto text-[10px] leading-relaxed text-ink-500">
                  {it.years.join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
        {detailed && !hasYears && (
          <p className="mt-2 text-center text-xs text-ink-500">Bu kulüp için yıl verisi bulunamadı.</p>
        )}
      </CardBody>
    </Card>
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
              <span className="text-sm font-semibold text-white drop-shadow">{team.stadiumName}</span>
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
