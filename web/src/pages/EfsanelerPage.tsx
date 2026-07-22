import { useMemo, useState } from 'react'
import { Crown, Search, Hand } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ArenaShell, GAME_THEMES, GameHero, GlassPanel } from '@/features/games/ui'
import { allLegends, type Legend } from '@/features/games/legends'
import { countryFlag } from '@/features/games/legendFlags'

const THEME = GAME_THEMES.legends
const PAGE = 48

const fold = (s: string) => s.toLocaleLowerCase('tr').trim()

function LegendCard({ l }: { l: Legend }) {
  return (
    <GlassPanel className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl leading-none">{countryFlag(l.country)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-bold uppercase tracking-wide text-white">
              {l.name}
            </h3>
            {l.isGoalkeeper && (
              <span title="Kaleci" className="shrink-0 rounded bg-amber-400/20 px-1 py-0.5 text-amber-200">
                <Hand className="h-3 w-3" />
              </span>
            )}
          </div>
          <div className="text-[11px] text-white/45">{l.country}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {l.clubs.map((c, i) => (
          <span
            key={i}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
              c.loan ? 'bg-white/5 text-white/45 italic' : 'bg-amber-500/12 text-amber-100',
            )}
          >
            {c.name}
          </span>
        ))}
      </div>
    </GlassPanel>
  )
}

export default function EfsanelerPage() {
  const legends = useMemo(() => allLegends(), [])
  const countries = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of legends) m.set(l.country, (m.get(l.country) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [legends])

  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [visible, setVisible] = useState(PAGE)

  const filtered = useMemo(() => {
    const fq = fold(q)
    return legends.filter(
      (l) =>
        (!country || l.country === country) &&
        (!fq ||
          fold(l.name).includes(fq) ||
          l.clubs.some((c) => fold(c.name).includes(fq))),
    )
  }, [legends, q, country])

  const shown = filtered.slice(0, visible)

  return (
    <ArenaShell theme={THEME} maxW="max-w-5xl">
      <GameHero theme={THEME} icon={Crown} title="Efsaneler" subtitle={`${legends.length} efsane · ${countries.length} ülke · tüm kulüp kariyerleri`} />

      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setVisible(PAGE)
            }}
            placeholder="Efsane veya kulüp ara…"
            className="w-full rounded-xl border border-white/12 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white outline-none backdrop-blur-md placeholder:text-white/40 focus:border-amber-400/60"
          />
        </div>
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            setVisible(PAGE)
          }}
          className="rounded-xl border border-white/12 bg-[#181428] py-2.5 pl-3 pr-8 text-sm font-medium text-white outline-none focus:border-amber-400/60"
        >
          <option value="">Tüm ülkeler ({legends.length})</option>
          {countries.map(([c, n]) => (
            <option key={c} value={c}>
              {c} ({n})
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-sm text-white/50">{filtered.length} sonuç</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l) => (
          <LegendCard key={`${l.country}-${l.name}`} l={l} />
        ))}
      </div>

      {visible < filtered.length && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-lg hover:brightness-110"
          >
            Daha fazla göster ({filtered.length - visible})
          </button>
        </div>
      )}
      {filtered.length === 0 && (
        <div className="grid h-40 place-items-center text-white/50">Sonuç yok.</div>
      )}
    </ArenaShell>
  )
}
