import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Trash2, Users, Sparkles, ArrowLeftRight } from 'lucide-react'
import { useSearch, useTeamSquad } from '@/features/football/hooks'
import type { SquadPlayer } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'

// A placed player needs enough to draw the chip and its info/actions menu. Kept
// small so the whole line-up still fits in localStorage.
interface Placed {
  playerApiId: number
  name: string
  photoUrl: string | null
  jerseyNumber?: number | null
  position?: string | null
  age?: number | null
  nationality?: string | null
  value?: number | null // career appearances, used as a playful "değer"
}

type Role = 'GK' | 'DEF' | 'MID' | 'ATT'
interface Slot {
  x: number // 0-100, left→right
  y: number // 0-100, top (attack) → bottom (own goal)
  role: Role
}

// Each formation is a set of lines (outfield only); the GK is added implicitly.
// Slots are emitted GK-first, then each line left→right, so a saved line-up
// keeps its players by index when the formation changes.
const FORMATIONS: Record<string, { y: number; n: number }[]> = {
  '4-3-3': [{ y: 73, n: 4 }, { y: 50, n: 3 }, { y: 17, n: 3 }],
  '4-4-2': [{ y: 73, n: 4 }, { y: 50, n: 4 }, { y: 18, n: 2 }],
  '4-2-3-1': [{ y: 74, n: 4 }, { y: 58, n: 2 }, { y: 37, n: 3 }, { y: 16, n: 1 }],
  '3-5-2': [{ y: 74, n: 3 }, { y: 50, n: 5 }, { y: 18, n: 2 }],
  '3-4-3': [{ y: 74, n: 3 }, { y: 52, n: 4 }, { y: 20, n: 3 }],
  '5-3-2': [{ y: 75, n: 5 }, { y: 50, n: 3 }, { y: 20, n: 2 }],
}
type FormationKey = keyof typeof FORMATIONS

// Evenly spaced x positions across the pitch width for a line of n players.
function xPositions(n: number): number[] {
  switch (n) {
    case 1:
      return [50]
    case 2:
      return [34, 66]
    case 3:
      return [22, 50, 78]
    case 4:
      return [14, 38, 62, 86]
    case 5:
      return [10, 30, 50, 70, 90]
    default: {
      const m = 12
      const step = (100 - 2 * m) / (n - 1)
      return Array.from({ length: n }, (_, i) => m + step * i)
    }
  }
}

function buildSlots(key: FormationKey): Slot[] {
  const slots: Slot[] = [{ x: 50, y: 91, role: 'GK' }]
  for (const line of FORMATIONS[key]) {
    const role: Role = line.y > 64 ? 'DEF' : line.y < 30 ? 'ATT' : 'MID'
    for (const x of xPositions(line.n)) slots.push({ x, y: line.y, role })
  }
  return slots
}

const ROLE_RING: Record<Role, string> = {
  GK: 'ring-amber-400/80',
  DEF: 'ring-sky-400/80',
  MID: 'ring-brand-400/90',
  ATT: 'ring-rose-400/80',
}

const ROLE_BADGE: Record<Role, string> = {
  GK: 'bg-amber-400 text-ink-950',
  DEF: 'bg-sky-400 text-ink-950',
  MID: 'bg-brand-400 text-ink-950',
  ATT: 'bg-rose-400 text-ink-950',
}

const ROLE_SHORT: Record<Role, string> = { GK: 'KAL', DEF: 'DEF', MID: 'OS', ATT: 'FOR' }
const ROLE_DOT: Record<Role, string> = {
  GK: 'bg-amber-400',
  DEF: 'bg-sky-400',
  MID: 'bg-brand-400',
  ATT: 'bg-rose-400',
}
const ROLE_ACCENT: Record<Role, string> = {
  GK: 'border-l-amber-400',
  DEF: 'border-l-sky-400',
  MID: 'border-l-brand-400',
  ATT: 'border-l-rose-400',
}
// Bench groups run forwards → midfielders → defenders → keepers.
const BENCH_ROLES: Role[] = ['ATT', 'MID', 'DEF', 'GK']

const surname = (name: string): string => name.trim().split(/\s+/).pop() ?? name

// Turkish role label for a bench player's API position.
function benchRole(pos: string | null): string {
  const r = roleForPosition(pos)
  return r ? ROLE_LABEL[r] : (pos ?? '')
}

// A free position (percent of the pitch) that overrides a player's formation slot.
type Pos = { x: number; y: number }
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

// What is being dragged: a player already on a slot, or a bench player.
type DragSource = { kind: 'slot'; index: number } | { kind: 'bench'; player: SquadPlayer }

const STORAGE_KEY = 'extratime:lineup:v1'

interface SavedState {
  formation: FormationKey
  title: string
  players: (Placed | null)[]
  captain: number | null
  positions: (Pos | null)[]
}

function loadSaved(): SavedState {
  const fallback: SavedState = {
    formation: '4-3-3',
    title: "Benim 11'im",
    players: Array(11).fill(null),
    captain: null,
    positions: Array(11).fill(null),
  }
  try {
    const raw = safeGetItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<SavedState>
    if (!parsed.formation || !FORMATIONS[parsed.formation]) return fallback
    const players = Array.isArray(parsed.players) ? parsed.players.slice(0, 11) : []
    while (players.length < 11) players.push(null)
    const positions = Array.isArray(parsed.positions) ? parsed.positions.slice(0, 11) : []
    while (positions.length < 11) positions.push(null)
    return {
      formation: parsed.formation as FormationKey,
      title: parsed.title || fallback.title,
      players: players as (Placed | null)[],
      captain: typeof parsed.captain === 'number' ? parsed.captain : null,
      positions: positions as (Pos | null)[],
    }
  } catch {
    return fallback
  }
}

function roleForPosition(pos: string | null): Role | null {
  switch (pos) {
    case 'Goalkeeper':
      return 'GK'
    case 'Defender':
      return 'DEF'
    case 'Midfielder':
      return 'MID'
    case 'Attacker':
      return 'ATT'
    default:
      return null
  }
}

// Full player card kept on the chip so the actions menu has position/age/value.
function squadToPlaced(p: SquadPlayer): Placed {
  return {
    playerApiId: p.playerApiId,
    name: p.name,
    photoUrl: p.photoUrl,
    jerseyNumber: p.jerseyNumber,
    position: p.position,
    age: p.age,
    nationality: p.nationality,
    value: p.careerApps,
  }
}

// Auto-fill the formation from a team's squad: the best (most-played) player for
// each slot's role, then any leftovers into still-empty slots.
function fillFromSquad(squad: SquadPlayer[], slots: Slot[]): (Placed | null)[] {
  const byRole: Record<Role, SquadPlayer[]> = { GK: [], DEF: [], MID: [], ATT: [] }
  // Rank by career peak so the XI is the established players even when the
  // current (preseason) season has no appearances yet.
  const prom = (p: SquadPlayer) => p.careerApps ?? p.appearances ?? 0
  const ranked = [...squad].sort((a, b) => prom(b) - prom(a))
  for (const p of ranked) {
    const r = roleForPosition(p.position)
    if (r) byRole[r].push(p)
  }
  const used = new Set<number>()
  const toPlaced = squadToPlaced
  const next: (Placed | null)[] = slots.map((slot) => {
    const list = byRole[slot.role]
    while (list.length && used.has(list[0].playerApiId)) list.shift()
    const p = list.shift()
    if (!p) return null
    used.add(p.playerApiId)
    return toPlaced(p)
  })
  const leftover = ranked.filter((p) => !used.has(p.playerApiId))
  for (let i = 0; i < next.length; i++) {
    if (!next[i]) {
      const p = leftover.shift()
      if (p) {
        used.add(p.playerApiId)
        next[i] = toPlaced(p)
      }
    }
  }
  return next
}

export function LineupBuilderPage() {
  const initial = useMemo(loadSaved, [])
  const [formation, setFormation] = useState<FormationKey>(initial.formation)
  const [title, setTitle] = useState(initial.title)
  const [players, setPlayers] = useState<(Placed | null)[]>(initial.players)
  const [captain, setCaptain] = useState<number | null>(() => initial.captain)
  const [positions, setPositions] = useState<(Pos | null)[]>(() => initial.positions)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [dragSource, setDragSource] = useState<DragSource | null>(null)
  // The open player actions menu (which slot + where on screen).
  const [menu, setMenu] = useState<{ idx: number; x: number; y: number } | null>(null)
  // When set, the next player tapped swaps places with this slot ("yer değiştir").
  const [swapFrom, setSwapFrom] = useState<number | null>(null)
  // Players sent away for squad planning, so they leave the bench pool.
  const [released, setReleased] = useState<{ player: Placed; kind: 'sold' | 'loaned' }[]>([])

  const slots = useMemo(() => buildSlots(formation), [formation])
  const filled = players.filter(Boolean).length

  // Persist on every change so a refresh keeps the same team.
  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify({ formation, title, players, captain, positions }))
  }, [formation, title, players, captain, positions])

  // Effective on-pitch position: a freely-dragged override, else the formation slot.
  const placedSlots = slots.map((s, i) => (positions[i] ? { ...s, ...positions[i]! } : s))

  // Changing the formation snaps everyone back to that shape.
  function chooseFormation(key: FormationKey) {
    setFormation(key)
    setPositions(Array(11).fill(null))
  }

  // Drop on the pitch: reposition a slot player, or sign a bench player into the
  // nearest slot at that spot.
  function dropAt(x: number, y: number) {
    const src = dragSource
    setDragSource(null)
    if (!src) return
    const px = clamp(x, 5, 95)
    const py = clamp(y, 6, 94)
    if (src.kind === 'slot') {
      // Dropped on top of another player → swap their places instead of stacking.
      let target = -1
      let best = Infinity
      placedSlots.forEach((s, i) => {
        if (i === src.index || !players[i]) return
        const d = (s.x - px) ** 2 + (s.y - py) ** 2
        if (d < best) {
          best = d
          target = i
        }
      })
      if (target >= 0 && best < 130) {
        swapSlots(src.index, target)
        return
      }
      // Otherwise, free-position the dragged player where they were dropped.
      setPositions((prev) => {
        const next = [...prev]
        next[src.index] = { x: px, y: py }
        return next
      })
      return
    }
    let nearest = 0
    let best = Infinity
    placedSlots.forEach((s, i) => {
      const d = (s.x - px) ** 2 + (s.y - py) ** 2
      if (d < best) {
        best = d
        nearest = i
      }
    })
    assign(nearest, squadToPlaced(src.player))
    setPositions((prev) => {
      const next = [...prev]
      next[nearest] = { x: px, y: py }
      return next
    })
  }

  // Drag a pitch player onto the bench to send them off (they rejoin the bench).
  function dropOnBench() {
    const src = dragSource
    setDragSource(null)
    if (src?.kind === 'slot') remove(src.index)
  }

  // Load a team's current squad onto the pitch (best player per slot role); the
  // rest of the squad becomes the bench.
  const [loadTeam, setLoadTeam] = useState<{ id: number; name: string } | null>(null)
  const [loadedSquad, setLoadedSquad] = useState<SquadPlayer[]>([])
  const [loadedTeamApiId, setLoadedTeamApiId] = useState<number | null>(null)
  const [loadedTeamName, setLoadedTeamName] = useState<string | null>(null)
  const { data: squadData } = useTeamSquad(loadTeam?.id ?? 0)
  useEffect(() => {
    if (loadTeam && squadData && squadData.team.id === loadTeam.id && squadData.squad.length) {
      setPlayers(fillFromSquad(squadData.squad, slots))
      setLoadedSquad(squadData.squad)
      setLoadedTeamApiId(squadData.team.apiFootballId)
      setLoadedTeamName(loadTeam.name)
      setTitle(loadTeam.name)
      setLoadTeam(null)
    }
  }, [loadTeam, squadData, slots])

  // Bench = the loaded squad's players who aren't in the XI or sent away.
  const onPitch = new Set(players.map((p) => p?.playerApiId).filter(Boolean))
  const gone = new Set(released.map((r) => r.player.playerApiId))
  const bench = loadedSquad
    .filter((p) => !onPitch.has(p.playerApiId) && !gone.has(p.playerApiId))
    .sort((a, b) => (b.careerApps ?? 0) - (a.careerApps ?? 0))
  const xiFull = players.every(Boolean)

  // Squad-planning summary: average age of the XI.
  const xi = players.filter((p): p is Placed => p != null)
  const ages = xi.map((p) => p.age).filter((a): a is number => a != null)
  const avgAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null

  function assign(idx: number, p: Placed) {
    setPlayers((prev) => {
      const next = [...prev]
      // If the player is already on the pitch elsewhere, move them (no clones).
      const existing = next.findIndex((x) => x?.playerApiId === p.playerApiId)
      if (existing >= 0 && existing !== idx) next[existing] = null
      next[idx] = p
      return next
    })
    setActiveSlot(null)
  }

  // Send a bench player into the first empty slot.
  function addFromBench(p: SquadPlayer) {
    const empty = players.findIndex((x) => x == null)
    if (empty < 0) return
    assign(empty, squadToPlaced(p))
  }

  function remove(idx: number) {
    setPlayers((prev) => {
      const next = [...prev]
      next[idx] = null
      return next
    })
  }

  function toggleCaptain(idx: number) {
    setCaptain((c) => (c === idx ? null : idx))
  }

  // Trade two players' places. Each slot keeps its own on-pitch spot (and free
  // override), so the two footballers cleanly swap positions; the captaincy
  // follows its player. Swapping into an empty slot just moves the player there.
  function swapSlots(a: number, b: number) {
    if (a === b) return
    setPlayers((prev) => {
      const next = [...prev]
      const tmp = next[a]
      next[a] = next[b]
      next[b] = tmp
      return next
    })
    setCaptain((c) => (c === a ? b : c === b ? a : c))
    setSwapFrom(null)
  }

  // Sell / loan out a player: they leave the XI and the bench pool.
  function sendAway(idx: number, kind: 'sold' | 'loaned') {
    const p = players[idx]
    if (p) setReleased((prev) => [...prev, { player: p, kind }])
    remove(idx)
    setMenu(null)
  }
  function recall(id: number) {
    setReleased((prev) => prev.filter((r) => r.player.playerApiId !== id))
  }

  function reset() {
    setPlayers(Array(11).fill(null))
    setCaptain(null)
    setPositions(Array(11).fill(null))
    setReleased([])
    setMenu(null)
    setSwapFrom(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-label text-brand-300">Kadro Kur</div>
          <h1 className="mt-1 text-2xl font-bold text-ink-100">İlk 11'ini kur</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-400">
            Dizilişini seç, boş oyuncuya dokun ve tüm liglerden dilediğin futbolcuyu ara.
            Kadron tarayıcında saklanır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-300">
            <Users className="h-4 w-4 text-brand-300" />
            <span className="tabular-nums">{filled}/11</span>
          </span>
          {avgAge != null && (
            <span className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-300">
              Yaş ort. <span className="font-bold text-ink-100 tabular-nums">{avgAge}</span>
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Pitch + bench strip */}
        <Card className="overflow-hidden p-3 sm:p-4">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <Pitch
                slots={placedSlots}
                players={players}
                captain={captain}
                teamApiId={loadedTeamApiId}
                teamName={loadedTeamName}
                swapFrom={swapFrom}
                onSlot={(i) => {
                  if (swapFrom !== null) return swapSlots(swapFrom, i)
                  setActiveSlot(i)
                }}
                onMenu={(i, e) => {
                  if (swapFrom !== null) return swapSlots(swapFrom, i)
                  setMenu({ idx: i, x: e.clientX, y: e.clientY })
                }}
                onRemove={remove}
                onCaptain={toggleCaptain}
                onDragStart={(i) => setDragSource({ kind: 'slot', index: i })}
                onDropAt={dropAt}
              />
              <p className="mt-2 text-center text-[11px] text-ink-500">
                {swapFrom !== null
                  ? 'Yer değiştirmek için başka bir oyuncuya (veya boş mevkiye) dokun'
                  : 'Oyuncuya tıkla → işlemler · sahada sürükle · üst üste bırakınca yer değişir'}
              </p>
            </div>

            {loadedSquad.length > 0 && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropOnBench}
                className="w-full shrink-0 rounded-xl border border-ink-800 bg-ink-950/40 p-2.5 sm:w-64"
              >
                <div className="section-label px-1 pb-2 text-[11px] text-ink-400">
                  Yedekler · {bench.length}
                </div>
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-0.5">
                  {BENCH_ROLES.map((role) => {
                    const group = bench.filter((p) => roleForPosition(p.position) === role)
                    if (group.length === 0) return null
                    return (
                      <div key={role}>
                        <div className="mb-1 flex items-center gap-1.5 px-0.5">
                          <span className={cn('h-2 w-2 rounded-full', ROLE_DOT[role])} />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-300">
                            {ROLE_LABEL[role]}
                          </span>
                          <span className="text-[10px] text-ink-600">{group.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                          {group.map((p) => (
                            <BenchChip
                              key={p.playerApiId}
                              player={p}
                              onDragStart={() => setDragSource({ kind: 'bench', player: p })}
                              onClick={() => addFromBench(p)}
                              disabled={xiFull}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {bench.length === 0 && (
                    <p className="px-1 py-2 text-center text-[11px] text-ink-600">
                      Herkes sahada
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Controls */}
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink-200">Kadro adı</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
            </label>
          </Card>

          <TeamLoader onLoad={setLoadTeam} />

          {released.length > 0 && (
            <Card className="space-y-2.5 p-4 shadow-lg shadow-amber-950/10 ring-1 ring-amber-500/40">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <ArrowLeftRight className="h-4 w-4" />
                Gönderilenler · {released.length}
              </div>
              <div className="space-y-2">
                {released.map(({ player, kind }) => (
                  <div
                    key={player.playerApiId}
                    className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-2.5 py-2"
                  >
                    <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-100">
                        {player.name}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 inline-block rounded px-1.5 py-px text-[9px] font-black tracking-wide',
                          kind === 'sold' ? 'bg-loss/20 text-loss' : 'bg-sky-500/20 text-sky-300',
                        )}
                      >
                        {kind === 'sold' ? '💰 SATILDI' : '🔄 KİRALIK'}
                      </span>
                    </span>
                    <button
                      onClick={() => recall(player.playerApiId)}
                      className="rounded-md border border-brand-500/40 px-2.5 py-1 text-[11px] font-semibold text-brand-300 transition hover:bg-brand-500/10"
                      title="Kadroya geri al"
                    >
                      Geri al
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="space-y-3 p-4">
            <div className="section-label text-ink-400">Diziliş</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FORMATIONS) as FormationKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => chooseFormation(key)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-sm font-semibold tabular-nums transition',
                    key === formation
                      ? 'border-brand-500 bg-brand-500 text-ink-950'
                      : 'border-ink-700 bg-ink-850 text-ink-200 hover:border-ink-600 hover:bg-ink-800',
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </Card>

          <Button variant="secondary" className="w-full" onClick={reset} disabled={filled === 0}>
            <Trash2 className="h-4 w-4" />
            Kadroyu temizle
          </Button>
        </div>
      </div>

      {menu !== null && players[menu.idx] && (
        <PlayerActionMenu
          player={players[menu.idx]!}
          isCaptain={captain === menu.idx}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onChange={() => {
            setActiveSlot(menu.idx)
            setMenu(null)
          }}
          onSwap={() => {
            setSwapFrom(menu.idx)
            setMenu(null)
          }}
          onCaptain={() => {
            toggleCaptain(menu.idx)
            setMenu(null)
          }}
          onBench={() => {
            remove(menu.idx)
            setMenu(null)
          }}
          onSell={() => sendAway(menu.idx, 'sold')}
          onLoan={() => sendAway(menu.idx, 'loaned')}
        />
      )}

      {activeSlot !== null && (
        <PlayerPicker
          role={slots[activeSlot].role}
          onClose={() => setActiveSlot(null)}
          onPick={(p) => assign(activeSlot, p)}
        />
      )}

      {swapFrom !== null && players[swapFrom] && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-brand-500/50 bg-ink-900 px-4 py-2.5 shadow-2xl shadow-ink-950/60">
            <span className="text-sm text-ink-100">
              <span className="font-bold text-brand-300">{surname(players[swapFrom]!.name)}</span> ile
              yer değiştir — bir oyuncuya dokun
            </span>
            <button
              onClick={() => setSwapFrom(null)}
              className="rounded-md border border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-300 transition hover:bg-ink-800"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerActionMenu({
  player,
  isCaptain,
  x,
  y,
  onClose,
  onChange,
  onSwap,
  onCaptain,
  onBench,
  onSell,
  onLoan,
}: {
  player: Placed
  isCaptain: boolean
  x: number
  y: number
  onClose: () => void
  onChange: () => void
  onSwap: () => void
  onCaptain: () => void
  onBench: () => void
  onSell: () => void
  onLoan: () => void
}) {
  const flag = flagEmoji(player.nationality ?? null)
  const left = Math.max(8, Math.min(x, window.innerWidth - 236))
  const top = Math.max(8, Math.min(y, window.innerHeight - 356))
  const items = [
    { icon: '🔀', label: 'Yer değiştir', onClick: onSwap },
    { icon: '🔁', label: 'Oyuncuyu değiştir', onClick: onChange },
    { icon: '👑', label: isCaptain ? 'Kaptanlığı al' : 'Kaptan yap', onClick: onCaptain },
    { icon: '🔻', label: 'Yedeğe al', onClick: onBench },
    { icon: '💰', label: 'Sat', onClick: onSell },
    { icon: '🔄', label: 'Kirala', onClick: onLoan },
  ]
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ left, top }}
        className="fixed w-56 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-ink-800 bg-ink-950/40 px-3 py-2.5">
          <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={38} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink-100">{player.name}</div>
            <div className="truncate text-[11px] text-ink-400">
              {flag} {benchRole(player.position ?? null)}
              {player.age != null ? ` · ${player.age} yaş` : ''}
            </div>
          </div>
        </div>
        <div className="p-1.5">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={it.onClick}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-200 transition hover:bg-ink-800"
            >
              <span className="w-5 text-center">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamLoader({ onLoad }: { onLoad: (t: { id: number; name: string }) => void }) {
  const [term, setTerm] = useState('')
  const { data } = useSearch(term)
  const teams = data?.teams ?? []
  return (
    <Card className="space-y-2 p-4">
      <div className="section-label flex items-center gap-1.5 text-ink-400">
        <Sparkles className="h-3.5 w-3.5 text-brand-300" />
        Hazır kadro yükle
      </div>
      <p className="text-xs text-ink-500">Bir takım ara; güncel kadrosu dizilişe otursun.</p>
      <div className="relative">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Takım ara (ör. Fenerbahçe)"
        />
        {term.trim().length >= 2 && teams.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 shadow-2xl">
            {teams.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    onLoad({ id: t.id, name: t.name })
                    setTerm('')
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-ink-800"
                >
                  <TeamLogo apiId={t.apiFootballId} size={22} />
                  <span className="truncate text-sm text-ink-100">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function BenchChip({
  player,
  onDragStart,
  onClick,
  disabled,
}: {
  player: SquadPlayer
  onDragStart: () => void
  onClick: () => void
  disabled: boolean
}) {
  const flag = flagEmoji(player.nationality)
  const roleKind = roleForPosition(player.position)
  const roleLabel = benchRole(player.position)
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      disabled={disabled}
      title={`${player.name} · ${roleLabel}${player.age != null ? ` · ${player.age} yaş` : ''}\nSahaya sürükle veya dokun`}
      className={cn(
        'flex w-full cursor-grab items-center gap-2 rounded-lg border border-l-[3px] border-ink-800 bg-ink-900 px-2 py-1.5 text-left transition hover:border-brand-500/50 hover:bg-ink-800 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60',
        roleKind ? ROLE_ACCENT[roleKind] : 'border-l-ink-600',
      )}
    >
      <div className="relative shrink-0">
        <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={34} />
        {flag && <span className="absolute -bottom-1 -right-1 text-xs leading-none">{flag}</span>}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-100">{player.name}</span>
        <span className="mt-0.5 flex items-center gap-1">
          {roleKind && (
            <span
              className={cn(
                'rounded px-1 text-[9px] font-black leading-tight text-ink-950',
                ROLE_DOT[roleKind],
              )}
            >
              {ROLE_SHORT[roleKind]}
            </span>
          )}
          <span className="truncate text-[10px] text-ink-400">
            {roleLabel}
            {player.jerseyNumber != null ? ` · #${player.jerseyNumber}` : ''}
          </span>
        </span>
      </span>
    </button>
  )
}

const ROLE_LABEL: Record<Role, string> = {
  GK: 'Kaleci',
  DEF: 'Defans',
  MID: 'Orta saha',
  ATT: 'Forvet',
}

function Pitch({
  slots,
  players,
  captain,
  teamApiId,
  teamName,
  swapFrom,
  onSlot,
  onMenu,
  onRemove,
  onCaptain,
  onDragStart,
  onDropAt,
}: {
  slots: Slot[]
  players: (Placed | null)[]
  captain: number | null
  teamApiId: number | null
  teamName: string | null
  swapFrom: number | null
  onSlot: (i: number) => void
  onMenu: (i: number, e: React.MouseEvent) => void
  onRemove: (i: number) => void
  onCaptain: (i: number) => void
  onDragStart: (i: number) => void
  onDropAt: (x: number, y: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        onDropAt(
          ((e.clientX - rect.left) / rect.width) * 100,
          ((e.clientY - rect.top) / rect.height) * 100,
        )
      }}
      className="relative mx-auto aspect-[3/4] w-full max-w-[480px] overflow-hidden rounded-2xl shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-950/60"
      style={{
        backgroundImage:
          'repeating-linear-gradient(180deg, #124d33 0 8.33%, #0e4229 8.33% 16.66%), radial-gradient(130% 90% at 50% 0%, rgba(194,245,66,0.10), transparent 55%)',
      }}
    >
      {/* Depth vignette */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_90px_rgba(0,0,0,0.45)]" />
      {/* Boundary + halfway line */}
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/30" />
      <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/30" />
      {/* Center circle + spot */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
      {/* Penalty + goal boxes */}
      <div className="pointer-events-none absolute left-1/2 top-3 h-[16%] w-[54%] -translate-x-1/2 border border-t-0 border-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-[7%] w-[28%] -translate-x-1/2 border border-t-0 border-white/30" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-[16%] w-[54%] -translate-x-1/2 border border-b-0 border-white/30" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-[7%] w-[28%] -translate-x-1/2 border border-b-0 border-white/30" />

      {/* Loaded team's identity — a clear crest + name badge in the corner, so
          it's obvious whose squad is on the pitch (no buried watermark). */}
      {teamApiId != null && (
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-lg bg-ink-950/75 px-2 py-1 ring-1 ring-white/15 backdrop-blur-sm">
          <TeamLogo apiId={teamApiId} size={20} />
          {teamName && (
            <span className="max-w-[140px] truncate text-[11px] font-bold text-white">{teamName}</span>
          )}
        </div>
      )}

      {slots.map((slot, i) => (
        <SlotChip
          key={i}
          slot={slot}
          player={players[i]}
          number={players[i]?.jerseyNumber ?? i + 1}
          isCaptain={captain === i}
          isSwapSource={swapFrom === i}
          swapping={swapFrom !== null}
          onClick={() => onSlot(i)}
          onMenu={(e) => onMenu(i, e)}
          onRemove={() => onRemove(i)}
          onCaptain={() => onCaptain(i)}
          onDragStart={() => onDragStart(i)}
        />
      ))}
    </div>
  )
}

function SlotChip({
  slot,
  player,
  number,
  isCaptain,
  isSwapSource,
  swapping,
  onClick,
  onMenu,
  onRemove,
  onCaptain,
  onDragStart,
}: {
  slot: Slot
  player: Placed | null
  number: number
  isCaptain: boolean
  isSwapSource: boolean
  swapping: boolean
  onClick: () => void
  onMenu: (e: React.MouseEvent) => void
  onRemove: () => void
  onCaptain: () => void
  onDragStart: () => void
}) {
  return (
    <div
      className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-200"
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      {player ? (
        <div className="group relative flex flex-col items-center">
          <button
            onClick={onMenu}
            draggable
            onDragStart={onDragStart}
            className={cn(
              'relative cursor-grab transition hover:scale-105 active:cursor-grabbing',
              swapping && !isSwapSource && 'hover:scale-110',
            )}
            title={swapping ? 'Yer değiştirmek için dokun' : 'Tıkla: işlemler · sürükle: taşı'}
          >
            <div
              className={cn(
                'grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-ink-950/80 shadow-lg shadow-ink-950/60 ring-2',
                isSwapSource ? 'ring-brand-400 ring-offset-2 ring-offset-emerald-900' : ROLE_RING[slot.role],
                isSwapSource && 'animate-pulse',
              )}
            >
              <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={52} />
            </div>
            <span
              className={cn(
                'absolute -bottom-1 -left-1 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[10px] font-black tabular-nums shadow ring-2 ring-ink-950/70',
                ROLE_BADGE[slot.role],
              )}
            >
              {number}
            </span>
          </button>
          <button
            onClick={onRemove}
            className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-loss text-white opacity-0 shadow transition group-hover:opacity-100"
            title="Kaldır"
            aria-label="Oyuncuyu kaldır"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            onClick={onCaptain}
            className={cn(
              'absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[11px] shadow transition',
              isCaptain
                ? 'bg-amber-400 opacity-100'
                : 'bg-ink-950/70 opacity-0 group-hover:opacity-100',
            )}
            title={isCaptain ? 'Kaptanlığı kaldır' : 'Kaptan yap'}
            aria-label="Kaptan"
          >
            👑
          </button>
          <span className="mt-1.5 flex max-w-[96px] items-center gap-1 truncate rounded-md bg-ink-950/85 px-2 py-0.5 text-[11px] font-bold text-white shadow ring-1 ring-white/10">
            {isCaptain && <span className="text-amber-300">©</span>}
            <span className="truncate">{surname(player.name)}</span>
          </span>
        </div>
      ) : (
        <button
          onClick={onClick}
          className={cn(
            'grid h-12 w-12 place-items-center rounded-full border-2 border-dashed bg-ink-950/30 backdrop-blur-sm transition hover:scale-105 hover:border-white/70 hover:bg-ink-950/50',
            'border-white/40',
          )}
          title={`${ROLE_LABEL[slot.role]} ekle`}
        >
          <span className="flex flex-col items-center leading-none text-white/70">
            <Plus className="h-4 w-4" />
            <span className="mt-0.5 text-[8px] font-bold tracking-wide">{ROLE_SHORT[slot.role]}</span>
          </span>
        </button>
      )}
    </div>
  )
}

function PlayerPicker({
  role,
  onClose,
  onPick,
}: {
  role: Role
  onClose: () => void
  onPick: (p: Placed) => void
}) {
  const [term, setTerm] = useState('')
  const { data, isFetching } = useSearch(term)
  const results = data?.players ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
          <span className="text-sm font-semibold text-ink-100">
            {ROLE_LABEL[role]} için oyuncu ara
          </span>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Oyuncu adı (ör. Haaland)"
          />
          <div className="mt-2 max-h-[46vh] overflow-y-auto">
            {term.trim().length < 2 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-500">
                Aramak için en az 2 harf yaz.
              </p>
            ) : results.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-500">
                {isFetching ? 'Aranıyor…' : 'Sonuç bulunamadı.'}
              </p>
            ) : (
              <ul className="divide-y divide-ink-850">
                {results.map((p) => (
                  <li key={p.playerApiId}>
                    <button
                      onClick={() =>
                        onPick({ playerApiId: p.playerApiId, name: p.name, photoUrl: p.photoUrl })
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-ink-800"
                    >
                      <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={34} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink-100">{p.name}</span>
                        {p.teamName && (
                          <span className="block truncate text-xs text-ink-400">{p.teamName}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
