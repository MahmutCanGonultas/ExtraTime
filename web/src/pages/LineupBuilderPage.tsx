import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  X,
  Trash2,
  Users,
  Sparkles,
  ArrowLeftRight,
  Save,
  FolderOpen,
  PenLine,
  Eraser,
  ChevronDown,
} from 'lucide-react'
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
  '4-1-4-1': [{ y: 73, n: 4 }, { y: 58, n: 1 }, { y: 40, n: 4 }, { y: 18, n: 1 }],
  '4-5-1': [{ y: 73, n: 4 }, { y: 50, n: 5 }, { y: 18, n: 1 }],
  '4-4-1-1': [{ y: 73, n: 4 }, { y: 52, n: 4 }, { y: 34, n: 1 }, { y: 17, n: 1 }],
  '3-5-2': [{ y: 74, n: 3 }, { y: 50, n: 5 }, { y: 18, n: 2 }],
  '3-4-3': [{ y: 74, n: 3 }, { y: 52, n: 4 }, { y: 20, n: 3 }],
  '4-3-2-1': [{ y: 73, n: 4 }, { y: 52, n: 3 }, { y: 34, n: 2 }, { y: 17, n: 1 }],
  '5-3-2': [{ y: 75, n: 5 }, { y: 50, n: 3 }, { y: 20, n: 2 }],
  '5-4-1': [{ y: 75, n: 5 }, { y: 50, n: 4 }, { y: 18, n: 1 }],
  // Joke formation: a ten-man wall across the back, nobody up front.
  '10-0-0': [{ y: 74, n: 10 }],
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

// A short tactical note per formation, shown under the shape picker.
const FORMATION_NOTES: Record<string, string> = {
  '4-3-3': 'Geniş kanatlar, yüksek pres — topa sahip olma odaklı.',
  '4-4-2': 'Dengeli ve kompakt, iki santrafor ikilisi.',
  '4-2-3-1': 'Çift pivot güvenlik, arkasındaki 10 numara yaratıcılık.',
  '3-5-2': 'Kanat bekleri tüm koridoru kat eder, ortada sayısal üstünlük.',
  '3-4-3': 'Cesur ve ofansif — kanatlarda baskı, riskli ama etkili.',
  '5-3-2': 'Kompakt beşli savunma, hızlı kontra atak.',
  '10-0-0': '🧱 Otobüsü çektik — herkes savunmada, gol yeme derdi yok!',
}

// User-drawn tactical arrows, in pitch-percent coords. Each arrow has a tactical
// KIND so the same drawing tool can express passes, runs and pressing — each with
// its own colour + line style, the way a coach's whiteboard does.
type ArrowKind = 'pass' | 'run' | 'press'
interface Arrow {
  x1: number
  y1: number
  x2: number
  y2: number
  kind: ArrowKind
}
const ARROW_STYLES: Record<ArrowKind, { label: string; hint: string; color: string; dash?: string }> = {
  pass: { label: 'Pas', hint: 'düz çizgi — topun gideceği yön', color: '#c2f542' },
  run: { label: 'Koşu', hint: 'kesik çizgi — oyuncunun koşusu', color: '#38bdf8', dash: '5 3' },
  press: { label: 'Pres', hint: 'noktalı — baskı / markaj yönü', color: '#fb7185', dash: '1.5 3' },
}
const ARROW_KINDS = Object.keys(ARROW_STYLES) as ArrowKind[]

const ARROWS_KEY = 'extratime:lineup:arrows:v1'
function loadArrows(): Arrow[] {
  const raw = safeGetItem(ARROWS_KEY)
  if (!raw) return []
  try {
    const a = JSON.parse(raw)
    if (!Array.isArray(a)) return []
    // Older saves had no kind — treat them as passes.
    return a.map((x): Arrow => ({
      x1: x.x1,
      y1: x.y1,
      x2: x.x2,
      y2: x.y2,
      kind: ARROW_STYLES[x?.kind as ArrowKind] ? x.kind : 'pass',
    }))
  } catch {
    return []
  }
}
function saveArrows(a: Arrow[]) {
  safeSetItem(ARROWS_KEY, JSON.stringify(a))
}

const ROLE_RING: Record<Role, string> = {
  GK: 'ring-amber-400/80',
  DEF: 'ring-sky-400/80',
  MID: 'ring-brand-400/90',
  ATT: 'ring-rose-400/80',
}

const ROLE_BADGE: Record<Role, string> = {
  GK: 'bg-amber-400 text-amber-950',
  DEF: 'bg-sky-400 text-sky-950',
  MID: 'bg-brand-400 text-ink-950',
  ATT: 'bg-rose-400 text-rose-950',
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

// Team-wide tactical instructions — the classic coach controls. They also reshape
// the block on the pitch: mentality + line push the team up (toward the opponent)
// or drop it deep, width spreads it across the flanks or squeezes it inside.
type Mentality = 'attack' | 'balanced' | 'defend'
type Line = 'high' | 'mid' | 'low'
type Tempo = 'fast' | 'balanced' | 'slow'
type Width = 'wide' | 'normal' | 'narrow'
type Passing = 'short' | 'mixed' | 'long'
interface Tactics {
  mentality: Mentality
  line: Line
  tempo: Tempo
  width: Width
  passing: Passing
}
const DEFAULT_TACTICS: Tactics = {
  mentality: 'balanced',
  line: 'mid',
  tempo: 'balanced',
  width: 'normal',
  passing: 'mixed',
}

// Special on-pitch duties beyond the captain: who takes penalties, free-kicks and
// corners, plus the vice-captain. Each holds a slot index (0-10) or null.
interface Duties {
  penalty: number | null
  freekick: number | null
  corner: number | null
  vice: number | null
}
const NO_DUTIES: Duties = { penalty: null, freekick: null, corner: null, vice: null }
const DUTY_META: { key: keyof Duties; label: string; tag: string }[] = [
  { key: 'penalty', label: 'Penaltıcı', tag: 'P' },
  { key: 'freekick', label: 'Serbest vuruş', tag: 'SV' },
  { key: 'corner', label: 'Kornerci', tag: 'K' },
  { key: 'vice', label: 'Yardımcı kaptan', tag: 'YK' },
]
function normalizeDuties(d: Partial<Duties> | null | undefined): Duties {
  if (!d || typeof d !== 'object') return { ...NO_DUTIES }
  const n = (v: unknown): number | null => (typeof v === 'number' && v >= 0 && v < 11 ? v : null)
  return { penalty: n(d.penalty), freekick: n(d.freekick), corner: n(d.corner), vice: n(d.vice) }
}
// Drop every duty that points at a slot (used when that player leaves the pitch).
function clearDutiesAt(d: Duties, idx: number): Duties {
  const out = { ...d }
  for (const { key } of DUTY_META) if (out[key] === idx) out[key] = null
  return out
}
// Follow a two-slot swap so each duty stays with its own player.
function swapDuties(d: Duties, a: number, b: number): Duties {
  const out = { ...d }
  for (const { key } of DUTY_META) out[key] = d[key] === a ? b : d[key] === b ? a : d[key]
  return out
}

// The segmented controls shown in the "Takım Talimatları" card, ordered low→high.
const TACTIC_GROUPS: { key: keyof Tactics; label: string; options: { v: string; label: string }[] }[] = [
  { key: 'mentality', label: 'Mentalite', options: [
    { v: 'defend', label: 'Savunma' }, { v: 'balanced', label: 'Dengeli' }, { v: 'attack', label: 'Hücum' }] },
  { key: 'line', label: 'Savunma çizgisi', options: [
    { v: 'low', label: 'Alçak' }, { v: 'mid', label: 'Orta' }, { v: 'high', label: 'Yüksek' }] },
  { key: 'tempo', label: 'Tempo', options: [
    { v: 'slow', label: 'Sakin' }, { v: 'balanced', label: 'Dengeli' }, { v: 'fast', label: 'Hızlı' }] },
  { key: 'width', label: 'Genişlik', options: [
    { v: 'narrow', label: 'Dar' }, { v: 'normal', label: 'Normal' }, { v: 'wide', label: 'Geniş' }] },
  { key: 'passing', label: 'Pas stili', options: [
    { v: 'short', label: 'Kısa' }, { v: 'mixed', label: 'Karışık' }, { v: 'long', label: 'Uzun' }] },
]

function normalizeTactics(t: Partial<Tactics> | null | undefined): Tactics {
  if (!t || typeof t !== 'object') return { ...DEFAULT_TACTICS }
  const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
    allowed.includes(v as T) ? (v as T) : d
  return {
    mentality: pick(t.mentality, ['attack', 'balanced', 'defend'] as const, 'balanced'),
    line: pick(t.line, ['high', 'mid', 'low'] as const, 'mid'),
    tempo: pick(t.tempo, ['fast', 'balanced', 'slow'] as const, 'balanced'),
    width: pick(t.width, ['wide', 'normal', 'narrow'] as const, 'normal'),
    passing: pick(t.passing, ['short', 'mixed', 'long'] as const, 'mixed'),
  }
}

// Reshape the base formation to reflect the instructions. The GK stays home; a
// freely-dragged override still wins over this (applied afterwards).
function applyTactics(slots: Slot[], t: Tactics): Slot[] {
  const yShift =
    (t.mentality === 'attack' ? -4 : t.mentality === 'defend' ? 5 : 0) +
    (t.line === 'high' ? -5 : t.line === 'low' ? 6 : 0)
  const xScale = t.width === 'wide' ? 1.14 : t.width === 'narrow' ? 0.8 : 1
  return slots.map((s) =>
    s.role === 'GK'
      ? s
      : { ...s, x: clamp(50 + (s.x - 50) * xScale, 6, 94), y: clamp(s.y + yShift, 10, 88) },
  )
}

// A short, human description of the chosen style, shown under the controls.
function tacticsSummary(t: Tactics): string {
  const M = {
    attack: 'Öne çıkan, baskılı bir oyun',
    balanced: 'Dengeli bir düzen',
    defend: 'Temkinli, kompakt bir blok',
  }
  const L = { high: 'yüksek savunma çizgisiyle', mid: 'orta blokla', low: 'geri çekilen bir hatla' }
  const T = { fast: 'yüksek tempoda', balanced: 'dengeli tempoda', slow: 'sakin tempoda' }
  const W = { wide: 'kanatlara yayılır', normal: 'dengeli genişlikte durur', narrow: 'içe kapanır' }
  const P = {
    short: 'kısa paslarla topu tutar',
    mixed: 'karışık paslarla dengeler',
    long: 'uzun toplarla hızlı çıkar',
  }
  return `${M[t.mentality]} ${L[t.line]}; ${T[t.tempo]} ${W[t.width]} ve ${P[t.passing]}.`
}

// What is being dragged: a player already on a slot, or a bench player.
type DragSource = { kind: 'slot'; index: number } | { kind: 'bench'; player: SquadPlayer }

const STORAGE_KEY = 'extratime:lineup:v1'
const SLOTS_KEY = 'extratime:lineup:slots:v1'
const MAX_SLOTS = 3

type Released = { player: Placed; kind: 'sold' | 'loaned' }

// The whole editable state — the XI plus the loaded squad's bench and sent-away
// list — so a lineup survives navigating away and can be saved to a named slot.
interface SavedState {
  formation: FormationKey
  title: string
  players: (Placed | null)[]
  captain: number | null
  positions: (Pos | null)[]
  loadedSquad: SquadPlayer[]
  loadedTeamApiId: number | null
  loadedTeamName: string | null
  released: Released[]
  tactics: Tactics
  duties: Duties
}

// A named save slot (max MAX_SLOTS), persisted separately from the live state.
interface SavedSlot {
  name: string
  savedAt: number
  state: SavedState
}

function emptyState(): SavedState {
  return {
    formation: '4-3-3',
    title: "Benim 11'im",
    players: Array(11).fill(null),
    captain: null,
    positions: Array(11).fill(null),
    loadedSquad: [],
    loadedTeamApiId: null,
    loadedTeamName: null,
    released: [],
    tactics: { ...DEFAULT_TACTICS },
    duties: { ...NO_DUTIES },
  }
}

// Coerce an unknown parsed blob into a valid SavedState (used for both the live
// state and each save slot), padding the fixed-length arrays.
function normalizeState(parsed: Partial<SavedState> | null | undefined): SavedState | null {
  if (!parsed || !parsed.formation || !FORMATIONS[parsed.formation]) return null
  const fallback = emptyState()
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
    loadedSquad: Array.isArray(parsed.loadedSquad) ? (parsed.loadedSquad as SquadPlayer[]) : [],
    loadedTeamApiId: typeof parsed.loadedTeamApiId === 'number' ? parsed.loadedTeamApiId : null,
    loadedTeamName: typeof parsed.loadedTeamName === 'string' ? parsed.loadedTeamName : null,
    released: Array.isArray(parsed.released) ? (parsed.released as Released[]) : [],
    tactics: normalizeTactics(parsed.tactics),
    duties: normalizeDuties(parsed.duties),
  }
}

function loadSaved(): SavedState {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return normalizeState(JSON.parse(raw) as Partial<SavedState>) ?? emptyState()
  } catch {
    return emptyState()
  }
}

function loadSlots(): SavedSlot[] {
  try {
    const raw = safeGetItem(SLOTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map((s): SavedSlot | null => {
        const state = normalizeState(s?.state)
        if (!state) return null
        return { name: String(s?.name ?? state.title), savedAt: Number(s?.savedAt ?? 0), state }
      })
      .filter((s): s is SavedSlot => s != null)
      .slice(0, MAX_SLOTS)
  } catch {
    return []
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
  const [arrows, setArrows] = useState<Arrow[]>(loadArrows)
  const [arrowMode, setArrowMode] = useState(false)
  const [arrowKind, setArrowKind] = useState<ArrowKind>('pass')
  const [formOpen, setFormOpen] = useState(true)

  function addArrow(a: Arrow) {
    setArrows((prev) => {
      const next = [...prev, a]
      saveArrows(next)
      return next
    })
  }
  function removeArrow(index: number) {
    setArrows((prev) => {
      const next = prev.filter((_, i) => i !== index)
      saveArrows(next)
      return next
    })
  }
  function clearArrows() {
    setArrows([])
    saveArrows([])
  }
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
  const [released, setReleased] = useState<Released[]>(() => initial.released)
  // The loaded team's roster (drives the bench) + its identity, persisted too so
  // the bench and team badge survive navigating away and back.
  const [loadedSquad, setLoadedSquad] = useState<SquadPlayer[]>(() => initial.loadedSquad)
  const [loadedTeamApiId, setLoadedTeamApiId] = useState<number | null>(() => initial.loadedTeamApiId)
  const [loadedTeamName, setLoadedTeamName] = useState<string | null>(() => initial.loadedTeamName)
  // Up to MAX_SLOTS named saved lineups.
  const [savedSlots, setSavedSlots] = useState<SavedSlot[]>(loadSlots)
  // Team-wide instructions + special duties (set-piece takers, vice-captain).
  const [tactics, setTactics] = useState<Tactics>(() => initial.tactics)
  const [duties, setDuties] = useState<Duties>(() => initial.duties)
  const [tacticsOpen, setTacticsOpen] = useState(false)

  const slots = useMemo(() => buildSlots(formation), [formation])
  const filled = players.filter(Boolean).length

  // Persist the whole live state on every change, so a refresh or a trip through
  // the nav keeps the exact same team, bench and sent-away list.
  useEffect(() => {
    const state: SavedState = {
      formation,
      title,
      players,
      captain,
      positions,
      loadedSquad,
      loadedTeamApiId,
      loadedTeamName,
      released,
      tactics,
      duties,
    }
    safeSetItem(STORAGE_KEY, JSON.stringify(state))
  }, [formation, title, players, captain, positions, loadedSquad, loadedTeamApiId, loadedTeamName, released, tactics, duties])

  useEffect(() => {
    safeSetItem(SLOTS_KEY, JSON.stringify(savedSlots))
  }, [savedSlots])

  // The formation reshaped by the team instructions (block pushed up / dropped deep,
  // spread wide / squeezed in). A freely-dragged override still wins over this.
  const shapedSlots = useMemo(() => applyTactics(slots, tactics), [slots, tactics])
  // Effective on-pitch position: a freely-dragged override, else the shaped slot.
  const placedSlots = shapedSlots.map((s, i) => (positions[i] ? { ...s, ...positions[i]! } : s))

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
    // A bench player ALWAYS snaps to its nearest formation slot at that slot's
    // tidy spot — never free-positioned at the cursor — so it can't land skewed
    // toward where you let go. (Any player already there is replaced and returns
    // to the bench.) Free positioning stays a slot-player-only affordance.
    assign(nearest, squadToPlaced(src.player))
    setPositions((prev) => {
      const next = [...prev]
      next[nearest] = null
      return next
    })
  }

  // Drag a pitch player onto the bench to send them off (they rejoin the bench).
  function dropOnBench() {
    const src = dragSource
    setDragSource(null)
    if (src?.kind === 'slot') remove(src.index)
  }

  // Touch/pen drag: free-position a slot player anywhere on the pitch (HTML5
  // drag-and-drop is dead on touch, so chips drive this via pointer events).
  function repositionSlot(idx: number, x: number, y: number) {
    setPositions((prev) => {
      const next = [...prev]
      next[idx] = { x: clamp(x, 5, 95), y: clamp(y, 6, 94) }
      return next
    })
  }

  // Load a team's current squad onto the pitch (best player per slot role); the
  // rest of the squad becomes the bench.
  const [loadTeam, setLoadTeam] = useState<{ id: number; name: string } | null>(null)
  const { data: squadData } = useTeamSquad(loadTeam?.id ?? 0)
  useEffect(() => {
    if (loadTeam && squadData && squadData.team.id === loadTeam.id && squadData.squad.length) {
      setPlayers(fillFromSquad(squadData.squad, slots))
      setLoadedSquad(squadData.squad)
      setLoadedTeamApiId(squadData.team.apiFootballId)
      setLoadedTeamName(loadTeam.name)
      setReleased([])
      setTitle(loadTeam.name)
      // A brand-new XI: drop the old captain / duties / drag overrides so their
      // slot indices don't silently land on unrelated players from the new squad.
      setCaptain(null)
      setDuties({ ...NO_DUTIES })
      setPositions(Array(11).fill(null))
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

  function currentSlot(): SavedSlot {
    const state: SavedState = {
      formation,
      title,
      players,
      captain,
      positions,
      loadedSquad,
      loadedTeamApiId,
      loadedTeamName,
      released,
      tactics,
      duties,
    }
    return { name: title.trim() || `Kadro ${savedSlots.length + 1}`, savedAt: Date.now(), state }
  }

  // Save the current lineup as a new named slot (up to MAX_SLOTS).
  function saveNewSlot() {
    setSavedSlots((prev) => (prev.length >= MAX_SLOTS ? prev : [...prev, currentSlot()]))
  }
  // Overwrite an existing slot with the current lineup.
  function overwriteSlot(index: number) {
    setSavedSlots((prev) => prev.map((s, i) => (i === index ? currentSlot() : s)))
  }

  // Load a saved slot back into the live editor.
  function loadSlot(index: number) {
    const slot = savedSlots[index]
    if (!slot) return
    const s = slot.state
    setFormation(s.formation)
    setTitle(s.title)
    setPlayers(s.players)
    setCaptain(s.captain)
    setPositions(s.positions)
    setLoadedSquad(s.loadedSquad)
    setLoadedTeamApiId(s.loadedTeamApiId)
    setLoadedTeamName(s.loadedTeamName)
    setReleased(s.released)
    setTactics(s.tactics ?? { ...DEFAULT_TACTICS })
    setDuties(s.duties ?? { ...NO_DUTIES })
    setMenu(null)
    setSwapFrom(null)
    setActiveSlot(null)
  }

  function deleteSlot(index: number) {
    setSavedSlots((prev) => prev.filter((_, i) => i !== index))
  }

  function assign(idx: number, p: Placed) {
    const existing = players.findIndex((x) => x?.playerApiId === p.playerApiId)
    setPlayers((prev) => {
      const next = [...prev]
      // If the player is already on the pitch elsewhere, move them (no clones).
      const ex = next.findIndex((x) => x?.playerApiId === p.playerApiId)
      if (ex >= 0 && ex !== idx) next[ex] = null
      next[idx] = p
      return next
    })
    // Moving them off their old slot leaves that slot empty — drop any captaincy /
    // duty it held so an unrelated player dropped there later doesn't inherit it.
    if (existing >= 0 && existing !== idx) {
      setCaptain((c) => (c === existing ? null : c))
      setDuties((d) => clearDutiesAt(d, existing))
    }
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
    // Drop any captaincy / special duty that pointed at the now-empty slot.
    setCaptain((c) => (c === idx ? null : c))
    setDuties((d) => clearDutiesAt(d, idx))
  }

  function toggleCaptain(idx: number) {
    setCaptain((c) => (c === idx ? null : idx))
  }

  // Assign a special duty to a slot (or clear it if it already holds that duty).
  function toggleDuty(role: keyof Duties, idx: number) {
    setDuties((d) => ({ ...d, [role]: d[role] === idx ? null : idx }))
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
    setDuties((d) => swapDuties(d, a, b))
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
    setDuties({ ...NO_DUTIES })
    clearArrows()
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

      {/* Kadro yönetimi — isim / kaydet / hazır-kadro işleri mantıksal olarak en üstte,
          böylece sağdaki taktik sütunu yalnızca sahaya dair kalır ve ferahlar. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="space-y-2 p-4">
          <label className="block space-y-1.5">
            <span className="section-label flex items-center gap-1.5 text-ink-400">
              <PenLine className="h-3.5 w-3.5 text-brand-300" /> Kadro adı
            </span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          </label>
          <p className="text-[11px] leading-relaxed text-ink-500">
            Kadrona bir isim ver; kaydettiğinde bu adla saklanır.
          </p>
        </Card>

        <SaveSlots
          slots={savedSlots}
          onSaveNew={saveNewSlot}
          onOverwrite={overwriteSlot}
          onLoad={loadSlot}
          onDelete={deleteSlot}
        />

        <TeamLoader onLoad={setLoadTeam} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Pitch + bench strip — stacked on phones, side by side from sm up. */}
        <Card className="overflow-hidden p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Pitch
                slots={placedSlots}
                arrows={arrows}
                arrowMode={arrowMode}
                arrowKind={arrowKind}
                onAddArrow={addArrow}
                onRemoveArrow={removeArrow}
                players={players}
                captain={captain}
                duties={duties}
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
                onReposition={repositionSlot}
              />
              <p className="mt-2 text-center text-[11px] text-ink-500">
                {swapFrom !== null
                  ? 'Yer değiştirmek için başka bir oyuncuya (veya boş mevkiye) dokun'
                  : 'Oyuncuya dokun → işlemler menüsü · sürükleyerek sahada istediğin yere taşı'}
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

        {/* Tactical sidebar — only on-pitch tools now (kadro yönetimi yukarı taşındı). */}
        <div className="space-y-4">
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
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <span className="section-label text-ink-400">Diziliş · {formation}</span>
              <ChevronDown
                className={cn('h-4 w-4 text-ink-400 transition', formOpen ? '' : '-rotate-90')}
              />
            </button>
            {formOpen && (
              <div className="space-y-3">
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
                      title={key === '10-0-0' ? 'Otobüsü çek! (şaka dizilişi)' : undefined}
                    >
                      {key === '10-0-0' ? '🧱 10-0-0' : key}
                    </button>
                  ))}
                </div>
                <p className="rounded-lg bg-ink-850 px-3 py-2 text-xs leading-relaxed text-ink-300">
                  <span className="font-semibold text-brand-300">{formation}</span> —{' '}
                  {FORMATION_NOTES[formation]}
                </p>
              </div>
            )}
          </Card>

          {/* Taktik Tahtası — ok çizme artık kendi belirgin kartında, her zaman görünür. */}
          <Card className="space-y-3 p-4 ring-1 ring-brand-500/30">
            <div className="section-label flex items-center gap-1.5 text-brand-300">
              <PenLine className="h-3.5 w-3.5" /> Taktik Tahtası
            </div>

            <button
              type="button"
              onClick={() => setArrowMode((v) => !v)}
              aria-pressed={arrowMode}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-bold transition active:scale-[0.99]',
                arrowMode
                  ? 'border-brand-500 bg-brand-500 text-ink-950 shadow-sm shadow-brand-500/25'
                  : 'border-brand-500/60 bg-brand-500/10 text-brand-200 hover:bg-brand-500/20',
              )}
            >
              <PenLine className="h-4 w-4" />
              {arrowMode ? 'Çizim açık — sahada sürükle' : 'Ok çiz'}
            </button>

            {arrowMode && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {ARROW_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setArrowKind(k)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold transition',
                        arrowKind === k
                          ? 'border-transparent'
                          : 'border-ink-700 bg-ink-850 text-ink-300 hover:text-ink-100',
                      )}
                      // Fixed dark label on the bright, non-theme fill — text-ink-950
                      // would flip to near-white in light theme and vanish.
                      style={
                        arrowKind === k
                          ? { backgroundColor: ARROW_STYLES[k].color, color: '#0e1626' }
                          : undefined
                      }
                    >
                      <span
                        className="h-0.5 w-4 rounded-full"
                        style={{
                          backgroundColor: arrowKind === k ? '#1a1f27' : ARROW_STYLES[k].color,
                          ...(ARROW_STYLES[k].dash
                            ? {
                                background: `repeating-linear-gradient(90deg, ${
                                  arrowKind === k ? '#1a1f27' : ARROW_STYLES[k].color
                                } 0 3px, transparent 3px 5px)`,
                              }
                            : {}),
                        }}
                      />
                      {ARROW_STYLES[k].label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-ink-500">
                  Sahada sürükleyerek çiz —{' '}
                  <span className="text-ink-300">{ARROW_STYLES[arrowKind].hint}</span>. Bir oku silmek
                  için sahada üstüne tıkla.
                </p>
              </div>
            )}

            {!arrowMode && arrows.length > 0 && (
              <p className="text-[11px] leading-relaxed text-ink-500">
                {arrows.length} ok çizili · birini silmek için sahada üstüne tıkla.
              </p>
            )}

            {arrows.length > 0 && (
              <div className="flex items-center justify-end border-t border-ink-800 pt-3">
                <button
                  type="button"
                  onClick={clearArrows}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-400 transition hover:border-loss/50 hover:text-loss"
                  title="Tüm okları sil"
                  aria-label="Tüm okları sil"
                >
                  <Eraser className="h-4 w-4" /> Okları temizle
                </button>
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <button
              type="button"
              onClick={() => setTacticsOpen((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <span className="section-label text-ink-400">Takım Talimatları</span>
              <ChevronDown
                className={cn('h-4 w-4 text-ink-400 transition', tacticsOpen ? '' : '-rotate-90')}
              />
            </button>
            {tacticsOpen && (
              <div className="space-y-3">
                {TACTIC_GROUPS.map((g) => (
                  <div key={g.key}>
                    <div className="mb-1.5 text-xs font-medium text-ink-300">{g.label}</div>
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-ink-850 p-1">
                      {g.options.map((o) => {
                        const active = (tactics[g.key] as string) === o.v
                        return (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => setTactics((t) => ({ ...t, [g.key]: o.v }) as Tactics)}
                            className={cn(
                              'rounded-md px-2 py-1.5 text-xs font-semibold transition',
                              active
                                ? 'bg-brand-500 text-ink-950 shadow-sm'
                                : 'text-ink-300 hover:text-ink-100',
                            )}
                          >
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <p className="rounded-lg bg-ink-850 px-3 py-2 text-[11px] leading-relaxed text-ink-400">
                  {tacticsSummary(tactics)}
                </p>
              </div>
            )}
          </Card>

          {filled > 0 && (
            <Card className="space-y-2 p-4">
              <div className="section-label text-ink-400">Görevler</div>
              <ul className="space-y-1.5 text-sm">
                {[
                  { label: 'Kaptan', icon: '👑', idx: captain },
                  { label: 'Yardımcı kaptan', icon: '🧢', idx: duties.vice },
                  { label: 'Penaltı', icon: '🎯', idx: duties.penalty },
                  { label: 'Serbest vuruş', icon: '🌀', idx: duties.freekick },
                  { label: 'Korner', icon: '🚩', idx: duties.corner },
                ].map((r) => {
                  const p = r.idx != null ? players[r.idx] : null
                  return (
                    <li key={r.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-ink-300">
                        <span className="w-4 text-center">{r.icon}</span>
                        {r.label}
                      </span>
                      <span
                        className={cn(
                          'truncate text-right font-semibold',
                          p ? 'text-ink-100' : 'text-ink-600',
                        )}
                      >
                        {p ? surname(p.name) : '—'}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="text-[11px] leading-relaxed text-ink-500">
                Sahadaki bir oyuncuya dokun → menüden görev ata. Rozetler formada P (penaltı),
                SV (serbest vuruş), K (korner), YK (yardımcı kaptan) olarak görünür.
              </p>
            </Card>
          )}

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
          dutyActive={{
            penalty: duties.penalty === menu.idx,
            freekick: duties.freekick === menu.idx,
            corner: duties.corner === menu.idx,
            vice: duties.vice === menu.idx,
          }}
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
          onDuty={(role) => toggleDuty(role, menu.idx)}
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

const DUTY_ICON: Record<keyof Duties, string> = {
  penalty: '🎯',
  freekick: '🌀',
  corner: '🚩',
  vice: '🧢',
}

function PlayerActionMenu({
  player,
  isCaptain,
  dutyActive,
  x,
  y,
  onClose,
  onChange,
  onSwap,
  onCaptain,
  onDuty,
  onBench,
  onSell,
  onLoan,
}: {
  player: Placed
  isCaptain: boolean
  dutyActive: Record<keyof Duties, boolean>
  x: number
  y: number
  onClose: () => void
  onChange: () => void
  onSwap: () => void
  onCaptain: () => void
  onDuty: (role: keyof Duties) => void
  onBench: () => void
  onSell: () => void
  onLoan: () => void
}) {
  const flag = flagEmoji(player.nationality ?? null)
  const left = Math.max(8, Math.min(x, window.innerWidth - 236))
  const top = Math.max(8, Math.min(y, window.innerHeight - 476))
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
        <div className="border-t border-ink-800 p-1.5">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Duran top & görev
          </div>
          {DUTY_META.map((d) => {
            const on = dutyActive[d.key]
            return (
              <button
                key={d.key}
                onClick={() => onDuty(d.key)}
                aria-pressed={on}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition',
                  on ? 'bg-brand-500/15 text-brand-200' : 'text-ink-200 hover:bg-ink-800',
                )}
              >
                <span className="w-5 text-center">{DUTY_ICON[d.key]}</span>
                <span className="flex-1">{d.label}</span>
                {on && <span className="text-xs font-black text-brand-300">✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SaveSlots({
  slots,
  onSaveNew,
  onOverwrite,
  onLoad,
  onDelete,
}: {
  slots: SavedSlot[]
  onSaveNew: () => void
  onOverwrite: (i: number) => void
  onLoad: (i: number) => void
  onDelete: (i: number) => void
}) {
  return (
    <Card className="space-y-2.5 p-4">
      <div className="section-label flex items-center gap-1.5 text-ink-400">
        <Save className="h-3.5 w-3.5 text-brand-300" /> Kayıtlı kadrolar
        <span className="ml-auto text-[10px] text-ink-600">
          {slots.length}/{MAX_SLOTS}
        </span>
      </div>
      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900 px-2.5 py-2"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-850 text-[11px] font-bold text-ink-400">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-100">
              {slot.name}
            </span>
            <button
              onClick={() => onLoad(i)}
              className="flex items-center gap-1 rounded-md border border-brand-500/40 px-2 py-1 text-[11px] font-semibold text-brand-300 transition hover:bg-brand-500/10"
            >
              <FolderOpen className="h-3 w-3" /> Yükle
            </button>
            <button
              onClick={() => onOverwrite(i)}
              title="Bu slotun üzerine kaydet"
              className="rounded-md border border-ink-700 px-2 py-1 text-[11px] text-ink-300 transition hover:bg-ink-800"
            >
              Güncelle
            </button>
            <button
              onClick={() => onDelete(i)}
              title="Sil"
              aria-label="Kadroyu sil"
              className="rounded-md p-1 text-ink-500 transition hover:text-loss"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {slots.length < MAX_SLOTS ? (
          <button
            onClick={onSaveNew}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-700 py-2 text-sm text-ink-300 transition hover:border-brand-500/50 hover:text-ink-100"
          >
            <Save className="h-3.5 w-3.5" /> Mevcut kadroyu kaydet
          </button>
        ) : (
          <p className="text-center text-[11px] text-ink-600">
            3 kadro dolu — birini güncelle ya da sil.
          </p>
        )}
      </div>
    </Card>
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

// Replace the browser's ugly default drag ghost (a translucent snapshot of the whole
// chip/card) with a clean, round avatar preview centred under the cursor.
function setAvatarDragImage(e: React.DragEvent, el: HTMLElement | null) {
  if (!el || !e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  try {
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2)
  } catch {
    /* setDragImage unsupported — fall back to the default ghost */
  }
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
  const avatarRef = useRef<HTMLDivElement>(null)
  return (
    <button
      draggable
      onDragStart={(e) => {
        setAvatarDragImage(e, avatarRef.current)
        onDragStart()
      }}
      onClick={onClick}
      disabled={disabled}
      title={`${player.name} · ${roleLabel}${player.age != null ? ` · ${player.age} yaş` : ''}\nDokun → sahaya ekle (masaüstünde sürükle)`}
      className={cn(
        'flex w-full cursor-grab items-center gap-2 rounded-lg border border-l-[3px] border-ink-800 bg-ink-900 px-2 py-1.5 text-left transition hover:border-brand-500/50 hover:bg-ink-800 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60',
        roleKind ? ROLE_ACCENT[roleKind] : 'border-l-ink-600',
      )}
    >
      <div ref={avatarRef} className="relative shrink-0 rounded-full bg-ink-950/80">
        <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={34} />
        {flag && <span className="absolute -bottom-1 -right-1 text-xs leading-none">{flag}</span>}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-100">{player.name}</span>
        <span className="mt-0.5 flex items-center gap-1">
          {roleKind && (
            <span
              className={cn('rounded px-1 text-[9px] font-black leading-tight', ROLE_BADGE[roleKind])}
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
  arrows,
  arrowMode,
  arrowKind,
  onAddArrow,
  onRemoveArrow,
  players,
  captain,
  duties,
  teamApiId,
  teamName,
  swapFrom,
  onSlot,
  onMenu,
  onRemove,
  onCaptain,
  onDragStart,
  onDropAt,
  onReposition,
}: {
  slots: Slot[]
  arrows: Arrow[]
  arrowMode: boolean
  arrowKind: ArrowKind
  onAddArrow: (a: Arrow) => void
  onRemoveArrow: (i: number) => void
  players: (Placed | null)[]
  captain: number | null
  duties: Duties
  teamApiId: number | null
  teamName: string | null
  swapFrom: number | null
  onSlot: (i: number) => void
  onMenu: (i: number, e: React.MouseEvent) => void
  onRemove: (i: number) => void
  onCaptain: (i: number) => void
  onDragStart: (i: number) => void
  onDropAt: (x: number, y: number) => void
  onReposition: (i: number, x: number, y: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Arrow | null>(null)
  const toPct = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  // Chip sizes scale with the measured pitch width so dense lines (5-back, 10-0-0)
  // don't overlap or clip on narrow phones. Before the first measure, use the max.
  const [pitchW, setPitchW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w) setPitchW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const av = pitchW ? Math.round(Math.min(52, Math.max(30, pitchW * 0.135))) : 52
  const chipSize = { avatar: av, box: av + 4, label: Math.round(av * 1.9), empty: Math.round(av * 0.9) }
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
      onPointerDown={
        arrowMode
          ? (e) => {
              // Stop the browser from starting a text/element selection (the blue
              // highlight over player names) while dragging to draw.
              e.preventDefault()
              const p = toPct(e)
              setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y, kind: arrowKind })
              e.currentTarget.setPointerCapture(e.pointerId)
            }
          : undefined
      }
      onPointerMove={
        arrowMode && draft
          ? (e) => {
              const p = toPct(e)
              setDraft({ ...draft, x2: p.x, y2: p.y })
            }
          : undefined
      }
      onPointerUp={
        arrowMode && draft
          ? (e) => {
              const p = toPct(e)
              const a = { ...draft, x2: p.x, y2: p.y }
              if (Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 3) onAddArrow(a)
              setDraft(null)
            }
          : undefined
      }
      className={cn(
        'relative mx-auto aspect-[3/4] w-full max-w-[480px] select-none overflow-hidden rounded-2xl shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-950/60',
        arrowMode && 'cursor-crosshair',
      )}
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
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 ring-1 ring-white/15 backdrop-blur-sm">
          <TeamLogo apiId={teamApiId} size={20} />
          {teamName && (
            <span className="max-w-[140px] truncate text-[11px] font-bold text-white">{teamName}</span>
          )}
        </div>
      )}

      {/* User-drawn tactical arrows (pass / run / press) + the live draft. Each
          arrow has a wide transparent "hit" line so it can be tapped to delete
          when not drawing; the arrowheads are one marker per kind (colour). */}
      {(arrows.length > 0 || draft) && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            {ARROW_KINDS.map((k) => (
              <marker
                key={k}
                id={`la-head-${k}`}
                markerWidth="7"
                markerHeight="7"
                refX="4.5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill={ARROW_STYLES[k].color} />
              </marker>
            ))}
          </defs>
          {arrows.map((a, k) => {
            const st = ARROW_STYLES[a.kind]
            return (
              <g key={k} className={cn(!arrowMode && 'la-arrow')}>
                <line
                  x1={a.x1}
                  y1={a.y1}
                  x2={a.x2}
                  y2={a.y2}
                  stroke="transparent"
                  strokeWidth={7}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: arrowMode ? 'none' : 'stroke' }}
                  onClick={arrowMode ? undefined : () => onRemoveArrow(k)}
                >
                  <title>Silmek için tıkla</title>
                </line>
                <line
                  className="la-vis"
                  x1={a.x1}
                  y1={a.y1}
                  x2={a.x2}
                  y2={a.y2}
                  stroke={st.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={st.dash}
                  markerEnd={`url(#la-head-${a.kind})`}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}
          {draft && (
            <line
              x1={draft.x1}
              y1={draft.y1}
              x2={draft.x2}
              y2={draft.y2}
              stroke={ARROW_STYLES[draft.kind].color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={ARROW_STYLES[draft.kind].dash}
              markerEnd={`url(#la-head-${draft.kind})`}
              vectorEffect="non-scaling-stroke"
              opacity={0.85}
            />
          )}
        </svg>
      )}

      {slots.map((slot, i) => (
        <SlotChip
          key={i}
          slot={slot}
          player={players[i]}
          number={players[i]?.jerseyNumber ?? i + 1}
          size={chipSize}
          isCaptain={captain === i}
          isVice={duties.vice === i}
          setPieceTags={DUTY_META.filter((d) => d.key !== 'vice' && duties[d.key] === i).map((d) => d.tag)}
          isSwapSource={swapFrom === i}
          swapping={swapFrom !== null}
          pitchRef={ref}
          dragEnabled={!arrowMode && swapFrom === null}
          onClick={() => onSlot(i)}
          onMenu={(e) => onMenu(i, e)}
          onRemove={() => onRemove(i)}
          onCaptain={() => onCaptain(i)}
          onDragStart={() => onDragStart(i)}
          onReposition={(x, y) => onReposition(i, x, y)}
        />
      ))}
    </div>
  )
}

function SlotChip({
  slot,
  player,
  number,
  size,
  isCaptain,
  isVice,
  setPieceTags,
  isSwapSource,
  swapping,
  pitchRef,
  dragEnabled,
  onClick,
  onMenu,
  onRemove,
  onCaptain,
  onDragStart,
  onReposition,
}: {
  slot: Slot
  player: Placed | null
  number: number
  size: { avatar: number; box: number; label: number; empty: number }
  isCaptain: boolean
  isVice: boolean
  setPieceTags: string[]
  isSwapSource: boolean
  swapping: boolean
  pitchRef: React.RefObject<HTMLDivElement | null>
  dragEnabled: boolean
  onClick: () => void
  onMenu: (e: React.MouseEvent) => void
  onRemove: () => void
  onCaptain: () => void
  onDragStart: () => void
  onReposition: (x: number, y: number) => void
}) {
  // Pointer drag for touch/pen (native HTML5 drag is dead on touch): move the chip
  // to follow the finger. A tap that never moves past the threshold is still a tap
  // (opens the menu). Mouse keeps the native drag path.
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggedRef = useRef(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  function handlePointerDown(e: React.PointerEvent) {
    if (!dragEnabled || e.pointerType === 'mouse') return
    draggedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* capture unsupported — drag just won't track, tap still works */
    }
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current || !pitchRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (!draggedRef.current && Math.hypot(dx, dy) < 7) return
    draggedRef.current = true
    const r = pitchRef.current.getBoundingClientRect()
    onReposition(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100)
  }
  function handlePointerUp(e: React.PointerEvent) {
    startRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }
  function handleClick(e: React.MouseEvent) {
    // A finished pointer-drag must not also open the menu.
    if (draggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      draggedRef.current = false
      return
    }
    onMenu(e)
  }
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-200"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: size.label + 12 }}
    >
      {player ? (
        <div className="group relative flex flex-col items-center">
          <button
            onClick={handleClick}
            draggable
            onDragStart={(e) => {
              setAvatarDragImage(e, avatarRef.current)
              onDragStart()
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ touchAction: dragEnabled ? 'none' : undefined }}
            className={cn(
              'relative cursor-grab transition hover:scale-105 active:cursor-grabbing',
              swapping && !isSwapSource && 'hover:scale-110',
            )}
            title={swapping ? 'Yer değiştirmek için dokun' : 'Dokun: menü · sürükle: taşı'}
          >
            <div
              ref={avatarRef}
              className={cn(
                'grid place-items-center overflow-hidden rounded-full bg-ink-950/80 shadow-lg shadow-ink-950/60 ring-2',
                isSwapSource ? 'ring-brand-400 ring-offset-2 ring-offset-emerald-900' : ROLE_RING[slot.role],
                isSwapSource && 'animate-pulse',
              )}
              style={{ height: size.box, width: size.box }}
            >
              <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={size.avatar} />
            </div>
            <span
              className={cn(
                'absolute -bottom-1 -left-1 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[10px] font-black tabular-nums shadow ring-2 ring-ink-950/70',
                ROLE_BADGE[slot.role],
              )}
            >
              {number}
            </span>
            {(setPieceTags.length > 0 || isVice) && (
              <span className="absolute -bottom-1 -right-1 flex gap-px">
                {isVice && (
                  <span className="grid h-4 min-w-[15px] place-items-center rounded bg-black/85 px-0.5 text-[8px] font-black text-sky-300 shadow ring-1 ring-white/10">
                    YK
                  </span>
                )}
                {setPieceTags.map((t) => (
                  <span
                    key={t}
                    className="grid h-4 min-w-[15px] place-items-center rounded bg-black/85 px-0.5 text-[8px] font-black text-brand-300 shadow ring-1 ring-white/10"
                  >
                    {t}
                  </span>
                ))}
              </span>
            )}
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
          <span
            className="mt-1.5 flex items-center gap-1 truncate rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white shadow ring-1 ring-white/10"
            style={{ maxWidth: size.label }}
          >
            {isCaptain && <span className="text-amber-300">©</span>}
            <span className="truncate">{surname(player.name)}</span>
          </span>
        </div>
      ) : (
        <button
          onClick={onClick}
          style={{ height: size.empty, width: size.empty }}
          className={cn(
            'grid place-items-center rounded-full border-2 border-dashed bg-ink-950/30 backdrop-blur-sm transition hover:scale-105 hover:border-white/70 hover:bg-ink-950/50',
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
