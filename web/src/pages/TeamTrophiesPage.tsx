import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useTeam } from '@/features/football/hooks'
import { wonTrophies, TrophyImage } from '@/features/football/trophyAssets'
import { TeamLogo } from '@/components/TeamLogo'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

export function TeamTrophiesPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const { data, isLoading, isError, refetch } = useTeam(teamId)

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Takım bulunamadı" />

  const { team, standings, trophies, trophyYears } = data
  const domesticLeagueId = standings.find((s) =>
    [39, 140, 78, 135, 61, 203].includes(s.leagueApiId),
  )?.leagueApiId
  const won = wonTrophies(trophies, domesticLeagueId, trophyYears)
  const total = won.reduce((sum, it) => sum + it.count, 0)

  return (
    <div className="space-y-6">
      {/* Gold header — the club's honours, front and centre. */}
      <section className="relative overflow-hidden rounded-card border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.14] via-ink-900 to-ink-950 px-5 py-5 sm:px-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(80% 130% at 100% 0%, rgba(251,191,36,0.18), transparent 55%)',
          }}
        />
        <div className="relative">
          <Link
            to={`/teams/${team.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-200/80 transition hover:text-amber-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {team.name}
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <div className="shrink-0 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <TeamLogo apiId={team.apiFootballId} size={56} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-100 sm:text-3xl">
                Kupa Dolabı
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-amber-300">
                <Trophy className="h-4 w-4" /> Toplam {total} kupa · {won.length} farklı kulvar
              </p>
            </div>
          </div>
        </div>
      </section>

      {won.length === 0 ? (
        <EmptyState title="Kupa verisi yok" description="Bu kulüp için kayıtlı kupa bulunamadı." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {won.map((it) => (
            <article
              key={it.key}
              className="relative overflow-hidden rounded-card border border-ink-800 bg-gradient-to-br from-ink-850 to-ink-950 p-5"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(70% 90% at 0% 0%, rgba(251,191,36,0.10), transparent 60%)',
                }}
              />
              <div className="relative flex items-start gap-4">
                {/* Big trophy photo */}
                <div className="flex h-32 w-24 shrink-0 items-end justify-center">
                  <TrophyImage src={it.img} label={it.label} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="score-num text-4xl font-black text-amber-300">{it.count}</span>
                    <span className="text-xs uppercase tracking-wide text-ink-500">kez</span>
                  </div>
                  <h2 className="mt-0.5 text-base font-bold text-ink-100">{it.label}</h2>
                  {it.years.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {it.years.map((y) => (
                        <span
                          key={y}
                          className="rounded-md bg-ink-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-300"
                        >
                          {y}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-600">Yıl bilgisi kayıtlı değil.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
