import { useEffect, useMemo, useState } from 'react'
import { Grid3x3, Search, X, Check, Trophy, Share2, RotateCcw } from 'lucide-react'
import { TeamLogo } from '@/components/TeamLogo'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { useDailyGrid, useGridGuess } from '@/features/games/hooks'
import { useGuessSearch } from '@/features/football/hooks'
import { ArenaShell, GAME_THEMES, GameHero, GlassPanel } from '@/features/games/ui'
import type { DailyGrid, GridCat } from '@/features/games/types'

const THEME = GAME_THEMES.kare

// Rarer cells (fewer valid players) are worth more.
function pointsFor(answerCount: number): number {
  return Math.max(1, Math.round(300 / (answerCount + 2)))
}

type CellState = { player: string; photoUrl: string | null; points: number } | { wrong: string } | null

// ── Category header (crest / flag / label) ──────────────────────────────────
function CatChip({ cat }: { cat: GridCat }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-center">
      {cat.kind === 'club' && cat.teamApiId != null ? (
        <TeamLogo apiId={cat.teamApiId} size={26} />
      ) : cat.kind === 'league' && cat.leagueApiId != null ? (
        <div className="flex h-7 items-center justify-center rounded bg-white/90 px-1">
          <TeamLogo apiId={cat.leagueApiId} kind="league" size={20} />
        </div>
      ) : cat.kind === 'nat' ? (
        <span className="text-2xl">{cat.label.split(' ')[0]}</span>
      ) : (
        <span className="text-lg">⚽</span>
      )}
      <span className="text-[10px] font-semibold leading-tight text-white/80">
        {cat.kind === 'nat' ? cat.label.split(' ').slice(1).join(' ') : cat.label}
      </span>
    </div>
  )
}

// ── Answer picker sheet ─────────────────────────────────────────────────────
function PickerSheet({
  rowCat,
  colCat,
  onPick,
  onClose,
  pending,
}: {
  rowCat: GridCat
  colCat: GridCat
  onPick: (playerApiId: number) => void
  onClose: () => void
  pending: boolean
}) {
  const [term, setTerm] = useState('')
  const { data, isFetching } = useGuessSearch(term)
  const players = data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/15 bg-[#0d1526]/95 shadow-2xl backdrop-blur-xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex flex-1 items-center gap-1.5 text-sm">
            <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-200">
              {rowCat.label}
            </span>
            <span className="text-white/30">×</span>
            <span className="rounded-lg bg-cyan-500/20 px-2 py-0.5 font-semibold text-cyan-200">
              {colCat.label}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative border-b border-white/10 p-3">
          <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Oyuncu ara…"
            className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400/60"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {term.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-white/50">
              Bu iki kategoriye de uyan bir oyuncu yaz.
            </p>
          ) : players.length === 0 && !isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-white/50">Sonuç yok.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {players.map((p) => (
                <li key={p.playerApiId}>
                  <button
                    disabled={pending}
                    onClick={() => onPick(p.playerApiId)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 disabled:opacity-50"
                  >
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover" />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-white/50">
                        <span>{flagEmoji(p.nationality) || '🏳️'}</span>
                        {p.position && <span>{p.position}</span>}
                        {p.teamName && <span className="text-white/40">· {p.teamName}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Confetti burst ──────────────────────────────────────────────────────────
const BURST_COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#f472b6', '#a78bfa']
function WinBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        dur: 1.3 + Math.random() * 0.9,
        color: BURST_COLORS[i % BURST_COLORS.length],
        drift: `${Math.round((Math.random() - 0.5) * 220)}px`,
        rot: `${Math.round(360 + Math.random() * 520)}deg`,
      })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              '--drift': p.drift,
              '--rot': p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function KareBulmacaPage() {
  const { data: grid, isLoading, isError } = useDailyGrid()

  return (
    <ArenaShell theme={THEME} maxW="max-w-2xl">
      <GameHero
        theme={THEME}
        icon={Grid3x3}
        title="Kare Bulmaca"
        subtitle="Günün ızgarası · her kareye satır + sütuna uyan bir oyuncu"
      />
      {isLoading ? (
        <div className="grid h-72 place-items-center text-white/50">Yükleniyor…</div>
      ) : isError || !grid ? (
        <div className="grid h-72 place-items-center text-white/50">Izgara yüklenemedi.</div>
      ) : (
        <GridBoard grid={grid} />
      )}
    </ArenaShell>
  )
}

function GridBoard({ grid }: { grid: DailyGrid }) {
  const storageKey = `kare-bulmaca:${grid.date}`
  const [cells, setCells] = useState<Record<string, CellState>>({})
  const [active, setActive] = useState<{ r: number; c: number } | null>(null)
  const [burst, setBurst] = useState(false)
  const guess = useGridGuess()

  useEffect(() => {
    const raw = safeGetItem(storageKey)
    if (raw) {
      try {
        setCells(JSON.parse(raw))
      } catch {
        /* ignore corrupt state */
      }
    }
  }, [storageKey])

  const persist = (next: Record<string, CellState>) => {
    setCells(next)
    safeSetItem(storageKey, JSON.stringify(next))
  }

  const cellAt = (r: number, c: number) => grid.cells.find((x) => x.row === r && x.col === c)!
  const key = (r: number, c: number) => `${r}-${c}`

  const resolved = Object.values(cells).filter(Boolean).length
  const correctCells = Object.values(cells).filter((v) => v && 'player' in v) as Array<{
    player: string
    points: number
  }>
  const score = correctCells.reduce((s, v) => s + v.points, 0)
  const done = resolved >= 9

  async function submit(playerApiId: number) {
    if (!active) return
    const { r, c } = active
    const res = await guess.mutateAsync({ row: r, col: c, playerApiId })
    const cell = cellAt(r, c)
    if (res.correct && res.player) {
      const next = {
        ...cells,
        [key(r, c)]: { player: res.player.name, photoUrl: res.player.photoUrl, points: pointsFor(cell.answerCount) },
      }
      persist(next)
      setBurst(true)
      setTimeout(() => setBurst(false), 1600)
    } else {
      persist({ ...cells, [key(r, c)]: { wrong: '✗' } })
    }
    setActive(null)
  }

  const shareText = useMemo(() => {
    if (!done) return ''
    let out = `Kare Bulmaca ${grid.date}\n`
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const v = cells[key(r, c)]
        out += v && 'player' in v ? '🟩' : '🟥'
      }
      out += '\n'
    }
    out += `${correctCells.length}/9 · ${score} puan`
    return out
  }, [done, cells, grid.date, correctCells.length, score])

  return (
    <>
      {burst && <WinBurst />}

      {/* Scoreboard */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <ScorePill label="Doğru" value={`${correctCells.length}/9`} tone="text-emerald-300" />
        <ScorePill label="Puan" value={String(score)} tone="text-amber-300" />
        <ScorePill label="Kalan" value={String(9 - resolved)} tone="text-cyan-200" />
      </div>

      {/* The 4×4 board */}
      <GlassPanel glow={THEME.glow1} className="p-2.5">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '0.8fr repeat(3, 1fr)' }}>
          <div className="flex items-center justify-center">
            <Grid3x3 className="h-5 w-5 text-white/20" />
          </div>
          {grid.cols.map((cat, i) => (
            <div key={`col-${i}`} className="rounded-xl bg-cyan-500/10 ring-1 ring-cyan-400/20">
              <CatChip cat={cat} />
            </div>
          ))}

          {grid.rows.map((rowCat, r) => (
            <div key={`row-${r}`} className="contents">
              <div className="flex items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <CatChip cat={rowCat} />
              </div>
              {grid.cols.map((_colCat, c) => {
                const v = cells[key(r, c)]
                const cellInfo = cellAt(r, c)
                return (
                  <button
                    key={`cell-${r}-${c}`}
                    disabled={!!v}
                    onClick={() => setActive({ r, c })}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-xl border transition',
                      v && 'player' in v
                        ? 'border-emerald-400/50 bg-emerald-500/15'
                        : v
                          ? 'border-rose-400/50 bg-rose-500/15'
                          : 'border-dashed border-white/15 bg-white/[0.02] hover:border-emerald-400/60 hover:bg-white/[0.06]',
                    )}
                  >
                    {v && 'player' in v ? (
                      <span className="animate-pop-in flex h-full flex-col items-center justify-center gap-1 p-1">
                        {v.photoUrl ? (
                          <img src={v.photoUrl} alt="" className="h-10 w-10 rounded-full bg-white/10 object-cover ring-2 ring-emerald-400/50" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/25">
                            <Check className="h-5 w-5 text-emerald-200" />
                          </div>
                        )}
                        <span className="line-clamp-2 px-0.5 text-center text-[10px] font-semibold leading-tight text-white">
                          {v.player}
                        </span>
                        <span className="rounded-full bg-amber-400/25 px-1.5 text-[10px] font-bold text-amber-200">
                          +{v.points}
                        </span>
                      </span>
                    ) : v ? (
                      <span className="flex h-full items-center justify-center">
                        <X className="h-8 w-8 text-rose-300/70" />
                      </span>
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-0.5 text-white/40">
                        <span className="text-2xl font-light text-white/40 group-hover:text-emerald-300">+</span>
                        <span className="text-[9px] text-white/25">{cellInfo.answerCount} cevap</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Result banner */}
      {done && (
        <GlassPanel glow={THEME.glow2} className="mt-4 p-5 text-center">
          <Trophy className="mx-auto mb-1 h-7 w-7 text-amber-300" />
          <div className="font-display text-2xl font-bold uppercase tracking-wide text-white">
            {correctCells.length}/9 · {score} puan
          </div>
          <p className="mt-0.5 text-sm text-white/60">
            {correctCells.length === 9
              ? 'Mükemmel ızgara! 🔥'
              : correctCells.length >= 6
                ? 'İyi iş!'
                : 'Yarın yeni bir ızgara seni bekliyor.'}
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(shareText).catch(() => {})}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-sm font-bold text-ink-950 shadow-lg hover:brightness-110"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </GlassPanel>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
        <RotateCcw className="h-3.5 w-3.5" /> Izgara her gün 00:00 UTC'de yenilenir · herkes aynı kareyi çözer
      </p>

      {active && (
        <PickerSheet
          rowCat={grid.rows[active.r]}
          colCat={grid.cols[active.c]}
          pending={guess.isPending}
          onPick={submit}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}

function ScorePill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <GlassPanel className="px-3 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className={cn('font-display text-2xl font-bold leading-tight', tone)}>{value}</div>
    </GlassPanel>
  )
}
