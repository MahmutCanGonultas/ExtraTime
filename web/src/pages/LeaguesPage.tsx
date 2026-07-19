import { Link } from 'react-router-dom'
import { ChevronRight, Trophy } from 'lucide-react'
import { useLeagues } from '@/features/football/hooks'
import type { League } from '@/features/football/types'
import { TeamLogo } from '@/components/TeamLogo'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

// Competition groupings, in the order they should appear.
const MAIN = [39, 140, 78, 135, 61, 203] // Premier, La Liga, Bundesliga, Serie A, Ligue 1, Süper Lig

// Each main league gets its own signature colour, so the featured cards read as
// six distinct, vivid identities rather than a uniform grid.
const LEAGUE_COLOR: Record<number, string> = {
  39: '#8b5cf6', // Premier League — purple
  140: '#f97316', // La Liga — orange
  78: '#ef4444', // Bundesliga — red
  135: '#3b82f6', // Serie A — blue
  61: '#14b8a6', // Ligue 1 — teal
  203: '#f43f5e', // Süper Lig — rose
}
const CUPS = [2, 3, 848, 1] // Champions, Europa, Conference, World Cup
const DOMESTIC_CUPS = [206, 45, 143, 137, 81, 66] // Türkiye Kupası, FA Cup, Copa del Rey, Coppa Italia, DFB Pokal, Coupe de France
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
  const known = new Set([...MAIN, ...CUPS, ...DOMESTIC_CUPS, ...OTHER, ...SECOND])
  const rest = [...byApi.values()]
    .filter((c) => !known.has(c.apiId))
    .sort((a, b) => a.head.name.localeCompare(b.head.name))

  const main = pick(MAIN)
  const cups = pick(CUPS)
  const domesticCups = pick(DOMESTIC_CUPS)
  const others = [...pick(OTHER), ...rest]
  const second = pick(SECOND)

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Ana Ligler" hint="En popüler altı lig" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      {domesticCups.length > 0 && (
        <section>
          <SectionHeader title="Yerel Kupalar" icon={<Trophy className="h-4 w-4 text-amber-400" />} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {domesticCups.map((c) => (
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
  const color = LEAGUE_COLOR[c.apiId] ?? '#c2f542'
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-xl hover:shadow-ink-950/50"
      style={{
        backgroundImage: `radial-gradient(120% 90% at 100% 0%, ${color}2e 0%, transparent 55%)`,
      }}
    >
      {/* Oversized crest as a brand watermark — anchored to the right and
          vertically centred so it sits inside the card instead of bleeding off
          a corner. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end overflow-hidden pr-3 opacity-[0.08] transition-transform duration-500 group-hover:scale-105">
        <TeamLogo apiId={c.head.apiFootballId} kind="league" size={168} />
      </div>
      {/* Colour spine */}
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: `linear-gradient(${color}, transparent)` }}
      />

      <div className="relative flex items-center gap-3.5">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl ring-1 ring-white/10"
          style={{ background: `${color}1f` }}
        >
          <TeamLogo apiId={c.head.apiFootballId} kind="league" size={44} />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-2xl font-bold uppercase leading-tight tracking-wide text-ink-100">
            {c.head.name}
          </div>
          <div className="truncate text-xs font-medium text-ink-400">{c.head.country}</div>
        </div>
      </div>

      <Link
        to={`/leagues/${c.current.id}`}
        className="relative mt-5 flex items-center justify-between rounded-xl px-3.5 py-3 font-semibold text-ink-950 transition hover:brightness-110"
        style={{ background: color }}
      >
        <span className="text-sm">{seasonLabel(c.current.season)} sezonu</span>
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
          Güncel <ChevronRight className="h-4 w-4" />
        </span>
      </Link>

      {c.past.length > 0 && (
        <div className="relative mt-2.5 flex flex-wrap gap-1.5">
          {c.past.slice(0, 5).map((s) => (
            <Link
              key={s.id}
              to={`/leagues/${s.id}`}
              className="rounded-md border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-ink-500 hover:text-ink-100"
            >
              {seasonLabel(s.season)}
            </Link>
          ))}
        </div>
      )}
    </div>
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
