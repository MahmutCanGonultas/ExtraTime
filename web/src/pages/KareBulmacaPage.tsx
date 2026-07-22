import { useEffect, useMemo, useState } from 'react'
import { Grid3x3, Search, X, Check, Trophy, Share2, RotateCcw } from 'lucide-react'
import { TeamLogo } from '@/components/TeamLogo'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { useDailyGrid, useGridGuess } from '@/features/games/hooks'
import { useGuessSearch } from '@/features/football/hooks'
import type { DailyGrid, GridCat } from '@/features/games/types'

// Rarer cells (fewer valid players) are worth more. Tuned so a 3-answer cell is
// ~60 pts and a crowded 100-answer cell is ~3.
function pointsFor(answerCount: number): number {
  return Math.max(1, Math.round(300 / (answerCount + 2)))
}

type CellState = { player: string; photoUrl: string | null; points: number } | { wrong: string } | null

// ── Category header (crest / flag / label) ──────────────────────────────────
function CatChip({ cat, corner }: { cat: GridCat; corner?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-1 text-center',
        corner ? 'py-2' : 'py-1.5',
      )}
    >
      {cat.kind === 'club' && cat.teamApiId != null ? (
        <TeamLogo apiId={cat.teamApiId} size={corner ? 34 : 26} />
      ) : cat.kind === 'league' && cat.leagueApiId != null ? (
        <div className="flex h-7 items-center justify-center rounded bg-white/90 px-1">
          <TeamLogo apiId={cat.leagueApiId} kind="league" size={corner ? 26 : 20} />
        </div>
      ) : cat.kind === 'nat' ? (
        <span className={corner ? 'text-3xl' : 'text-2xl'}>{cat.label.split(' ')[0]}</span>
      ) : (
        <span className="text-lg">⚽</span>
      )}
      <span
        className={cn(
          'font-semibold leading-tight text-ink-200',
          corner ? 'text-[11px]' : 'text-[10px]',
        )}
      >
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
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-ink-700 bg-ink-900 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
          <div className="flex flex-1 items-center gap-1.5 text-sm">
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-300">
              {rowCat.label}
            </span>
            <span className="text-ink-600">×</span>
            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-semibold text-sky-300">
              {colCat.label}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative border-b border-ink-800 p-3">
          <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Oyuncu ara…"
            className="w-full rounded-xl border border-ink-700 bg-ink-950 py-2.5 pl-9 pr-3 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-brand-500"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {term.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">
              Bu iki kategoriye de uyan bir oyuncu yaz.
            </p>
          ) : players.length === 0 && !isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">Sonuç yok.</p>
          ) : (
            <ul className="divide-y divide-ink-850">
              {players.map((p) => (
                <li key={p.playerApiId}>
                  <button
                    disabled={pending}
                    onClick={() => onPick(p.playerApiId)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-ink-800 disabled:opacity-50"
                  >
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full bg-ink-800 object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-full bg-ink-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-100">{p.name}</div>
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-ink-400">
                        <span>{flagEmoji(p.nationality) || '🏳️'}</span>
                        {p.position && <span>{p.position}</span>}
                        {p.teamName && <span className="text-ink-500">· {p.teamName}</span>}
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

// ── Confetti burst (self-contained) ─────────────────────────────────────────
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40">
          <Grid3x3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink-50">Kare Bulmaca</h1>
          <p className="text-sm text-ink-400">Günün ızgarası · her kareye satır + sütuna uyan bir oyuncu</p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid h-72 place-items-center text-ink-500">Yükleniyor…</div>
      ) : isError || !grid ? (
        <div className="grid h-72 place-items-center text-ink-500">Izgara yüklenemedi.</div>
      ) : (
        <GridBoard grid={grid} />
      )}
    </div>
  )
}

function GridBoard({ grid }: { grid: DailyGrid }) {
  const storageKey = `kare-bulmaca:${grid.date}`
  const [cells, setCells] = useState<Record<string, CellState>>({})
  const [active, setActive] = useState<{ r: number; c: number } | null>(null)
  const [burst, setBurst] = useState(false)
  const guess = useGridGuess()

  // Restore today's progress (daily puzzle → survives refresh).
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

  const cellAt = (r: number, c: number) =>
    grid.cells.find((x) => x.row === r && x.col === c)!
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
      if (Object.values(next).filter((v) => v && 'player' in v).length >= 1) {
        setBurst(true)
        setTimeout(() => setBurst(false), 1600)
      }
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
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 px-4 py-3">
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Doğru</div>
          <div className="text-lg font-bold text-emerald-300">{correctCells.length}/9</div>
        </div>
        <div className="h-8 w-px bg-ink-800" />
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Puan</div>
          <div className="text-lg font-bold text-amber-300">{score}</div>
        </div>
        <div className="h-8 w-px bg-ink-800" />
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Kalan hamle</div>
          <div className="text-lg font-bold text-ink-100">{9 - resolved}</div>
        </div>
      </div>

      {/* The 4×4 board: corner + 3 col heads on top, 3 row heads on the left. */}
      <div
        className="grid gap-1.5 rounded-2xl border border-ink-800 bg-gradient-to-b from-ink-900 to-ink-950 p-2.5"
        style={{ gridTemplateColumns: '0.8fr repeat(3, 1fr)' }}
      >
        <div className="flex items-center justify-center">
          <Grid3x3 className="h-5 w-5 text-ink-700" />
        </div>
        {grid.cols.map((cat, i) => (
          <div key={`col-${i}`} className="rounded-lg bg-sky-500/[0.08] ring-1 ring-sky-500/15">
            <CatChip cat={cat} />
          </div>
        ))}

        {grid.rows.map((rowCat, r) => (
          <div key={`row-${r}`} className="contents">
            <div className="flex items-center rounded-lg bg-emerald-500/[0.08] ring-1 ring-emerald-500/15">
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
                    'group relative aspect-square overflow-hidden rounded-lg border transition',
                    v && 'player' in v
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : v
                        ? 'border-rose-500/40 bg-rose-500/10'
                        : 'border-dashed border-ink-700 bg-ink-900 hover:border-brand-500 hover:bg-ink-850',
                  )}
                >
                  {v && 'player' in v ? (
                    <span className="animate-pop-in flex h-full flex-col items-center justify-center gap-1 p-1">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt="" className="h-10 w-10 rounded-full bg-ink-800 object-cover ring-2 ring-emerald-400/40" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/20">
                          <Check className="h-5 w-5 text-emerald-300" />
                        </div>
                      )}
                      <span className="line-clamp-2 px-0.5 text-center text-[10px] font-semibold leading-tight text-ink-100">
                        {v.player}
                      </span>
                      <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-300">
                        +{v.points}
                      </span>
                    </span>
                  ) : v ? (
                    <span className="flex h-full items-center justify-center">
                      <X className="h-8 w-8 text-rose-400/70" />
                    </span>
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-0.5 text-ink-600">
                      <span className="text-2xl font-light text-ink-600 group-hover:text-brand-400">+</span>
                      <span className="text-[9px] text-ink-700">{cellInfo.answerCount} cevap</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Result banner */}
      {done && (
        <div className="mt-4 rounded-xl border border-ink-800 bg-ink-900 p-4 text-center">
          <Trophy className="mx-auto mb-1 h-6 w-6 text-amber-300" />
          <div className="text-lg font-bold text-ink-50">
            {correctCells.length}/9 doğru · {score} puan
          </div>
          <p className="mt-0.5 text-sm text-ink-400">
            {correctCells.length === 9
              ? 'Mükemmel ızgara! 🔥'
              : correctCells.length >= 6
                ? 'İyi iş!'
                : 'Yarın yeni bir ızgara seni bekliyor.'}
          </p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareText).catch(() => {})
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-400"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-ink-600">
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
