import { Link } from 'react-router-dom'
import { ChevronRight, Trophy } from 'lucide-react'
import { useLeagues } from '@/features/football/hooks'
import type { League } from '@/features/football/types'
import { Card, CardBody } from '@/components/ui/Card'
import { TeamLogo } from '@/components/TeamLogo'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

// Competition groupings, in the order they should appear.
const MAIN = [39, 140, 78, 135, 61, 203] // Premier, La Liga, Bundesliga, Serie A, Ligue 1, Süper Lig
const CUPS = [2, 3, 848, 1] // Champions, Europa, Conference, World Cup
const OTHER = [94, 88, 71, 307, 253] // Portugal, Netherlands, Brazil, Saudi, MLS
const SECOND = [40, 141, 136, 79, 62, 95, 89, 72, 204, 308] // second divisions

interface Comp {
  apiId: number
  head: League
  current: League
  past: League[]
}

export function LeaguesPage() {
  const { data: leagues, isLoading, isError, refetch } = useLeagues(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    )
  }
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!leagues?.length) {
    return <EmptyState title="Henüz lig yok" description="Veriler senkronize edildiğinde burada görünecek." />
  }

  const byComp = new Map<number, League[]>()
  for (const league of leagues) {
    const list = byComp.get(league.apiFootballId) ?? []
    list.push(league)
    byComp.set(league.apiFootballId, list)
  }
  const byApi = new Map<number, Comp>()
  for (const [apiId, seasons] of byComp) {
    const head = seasons[0]
    const current = seasons.find((s) => s.isCurrent) ?? seasons[0]
    const past = seasons.filter((s) => s.id !== current.id).sort((a, b) => b.season - a.season)
    byApi.set(apiId, { apiId, head, current, past })
  }
  const pick = (ids: number[]) => ids.map((id) => byApi.get(id)).filter((c): c is Comp => Boolean(c))
  const known = new Set([...MAIN, ...CUPS, ...OTHER, ...SECOND])
  const rest = [...byApi.values()]
    .filter((c) => !known.has(c.apiId))
    .sort((a, b) => a.head.name.localeCompare(b.head.name))

  const main = pick(MAIN)
  const cups = pick(CUPS)
  const others = [...pick(OTHER), ...rest]
  const second = pick(SECOND)

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Ana Ligler" hint="En popüler altı lig" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {main.map((c) => (
            <FeaturedLeagueCard key={c.apiId} c={c} />
          ))}
        </div>
      </section>

      {cups.length > 0 && (
        <section>
          <SectionHeader title="Kupalar & Turnuvalar" icon={<Trophy className="h-4 w-4 text-amber-400" />} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cups.map((c) => (
              <CompactLeagueCard key={c.apiId} c={c} accent />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <SectionHeader title="Diğer Ligler" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {others.map((c) => (
              <CompactLeagueCard key={c.apiId} c={c} />
            ))}
          </div>
        </section>
      )}

      {second.length > 0 && (
        <section>
          <SectionHeader title="Alt Ligler" hint="İkinci divizyonlar" />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {second.map((c) => (
              <CompactLeagueCard key={c.apiId} c={c} dim />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionHeader({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="h-4 w-1 self-center rounded-full bg-brand-500" />
      {icon}
      <h2 className="text-lg font-bold text-ink-100">{title}</h2>
      {hint && <span className="text-xs text-ink-500">· {hint}</span>}
    </div>
  )
}

function FeaturedLeagueCard({ c }: { c: Comp }) {
  return (
    <Card className="transition hover:border-ink-700">
      <CardBody>
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-ink-950/40 ring-1 ring-ink-800">
            <TeamLogo apiId={c.head.apiFootballId} kind="league" size={40} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-ink-100">{c.head.name}</div>
            <div className="truncate text-xs text-ink-400">{c.head.country}</div>
          </div>
        </div>

        <Link
          to={`/leagues/${c.current.id}`}
          className="mt-4 flex items-center justify-between rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2.5 transition hover:bg-brand-500/20"
        >
          <span className="text-sm font-semibold text-ink-100">
            {seasonLabel(c.current.season)} sezonu
          </span>
          <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-950">
            Güncel
          </span>
        </Link>

        {c.past.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.past.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                to={`/leagues/${s.id}`}
                className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 transition hover:border-brand-500 hover:text-brand-300"
              >
                {seasonLabel(s.season)}
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function CompactLeagueCard({ c, accent, dim }: { c: Comp; accent?: boolean; dim?: boolean }) {
  return (
    <Link
      to={`/leagues/${c.current.id}`}
      className={cnCompact(accent, dim)}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-950/40 ring-1 ring-ink-800">
        <TeamLogo apiId={c.head.apiFootballId} kind="league" size={26} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-100">{c.head.name}</div>
        <div className="truncate text-[11px] text-ink-500">
          {c.head.country} · {seasonLabel(c.current.season)}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-600" />
    </Link>
  )
}

function cnCompact(accent?: boolean, dim?: boolean): string {
  const base =
    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition hover:bg-ink-850'
  if (accent) return `${base} border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/50`
  if (dim) return `${base} border-ink-850 bg-ink-900/60 hover:border-ink-700`
  return `${base} border-ink-800 bg-ink-900 hover:border-brand-500/40`
}
