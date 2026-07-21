import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, RotateCcw, Eye, Trophy, User, Check, Search } from 'lucide-react'
import { useGuessPool, useGuessSearch } from '@/features/football/hooks'
import type { GuessPoolPlayer } from '@/features/football/types'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'

// Guessable sources the player can toggle. The answer pool defaults to the five
// big leagues + the four biggest Turkish clubs; extra leagues can be added.
const ALL_LEAGUES: Array<{ id: number; name: string }> = [
  { id: 140, name: 'La Liga' },
  { id: 39, name: 'Premier Lig' },
  { id: 78, name: 'Bundesliga' },
  { id: 135, name: 'Serie A' },
  { id: 61, name: 'Ligue 1' },
  { id: 94, name: 'Portekiz' },
  { id: 88, name: 'Hollanda' },
  { id: 71, name: 'Brezilya' },
  { id: 307, name: 'Suudi Arabistan' },
  { id: 253, name: 'MLS' },
]
const DEFAULT_LEAGUES = [140, 39, 78, 135, 61]
const TURKISH_CLUBS = [611, 645, 549, 998] // Fenerbahçe, Galatasaray, Beşiktaş, Trabzonspor
const SOURCES_KEY = 'extratime:guess:sources:v1'

interface Sources {
  leagues: number[]
  turkish: boolean
}
function loadSources(): Sources {
  const raw = safeGetItem(SOURCES_KEY)
  if (raw) {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p.leagues) && typeof p.turkish === 'boolean') {
        const leagues = p.leagues.filter((id: number) => ALL_LEAGUES.some((l) => l.id === id))
        if (leagues.length > 0 || p.turkish) return { leagues, turkish: p.turkish }
      }
    } catch {
      /* fall back to default */
    }
  }
  return { leagues: DEFAULT_LEAGUES, turkish: true }
}
function saveSources(s: Sources) {
  safeSetItem(SOURCES_KEY, JSON.stringify(s))
}

function PoolSelector({
  leagues,
  turkishOn,
  onToggleLeague,
  onToggleTurkish,
}: {
  leagues: number[]
  turkishOn: boolean
  onToggleLeague: (id: number) => void
  onToggleTurkish: () => void
}) {
  const chip = (on: boolean) =>
    cn(
      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
      on
        ? 'border-brand-500 bg-brand-500/15 text-brand-200'
        : 'border-ink-800 bg-ink-850 text-ink-500 hover:border-ink-600 hover:text-ink-300',
    )
  return (
    <Card className="p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        Havuz — gizli oyuncu hangi liglerden gelsin (ekle / çıkar)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_LEAGUES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onToggleLeague(l.id)}
            className={chip(leagues.includes(l.id))}
          >
            <TeamLogo apiId={l.id} kind="league" size={16} /> {l.name}
          </button>
        ))}
        <button type="button" onClick={onToggleTurkish} className={chip(turkishOn)}>
          <span className="flex -space-x-1.5">
            {TURKISH_CLUBS.map((id) => (
              <TeamLogo key={id} apiId={id} size={16} />
            ))}
          </span>
          Türk kulüpleri
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        Seçtiğin kaynaklardan rastgele oyuncu gelir. En az bir kaynak seçili olmalı.
      </p>
    </Card>
  )
}

// Accent- and case-insensitive so "odegaard" matches "Ødegaard" and the Turkish
// dotted/undotted i behaves. Mirrors the server-side unaccent search.
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ø/gi, 'o')
    .toLowerCase()
    .trim()
}

const POS_TR: Record<string, string> = {
  Goalkeeper: 'Kaleci',
  Defender: 'Defans',
  Midfielder: 'Orta Saha',
  Attacker: 'Forvet',
}
const posLabel = (p: string | null) => (p ? (POS_TR[p] ?? p) : '—')

// Role-coloured chip so a position reads at a glance in the search list.
const POS_CHIP: Record<string, string> = {
  Goalkeeper: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  Defender: 'bg-sky-500/15 text-sky-300 ring-sky-500/25',
  Midfielder: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
  Attacker: 'bg-rose-500/15 text-rose-300 ring-rose-500/25',
}
const posChip = (p: string | null) => (p && POS_CHIP[p]) || 'bg-ink-700 text-ink-300 ring-ink-600'

const MAX_GUESSES = 8

type TileState = 'match' | 'close' | 'miss' | 'unknown'
type Arrow = 'up' | 'down' | null

// null vs null == both unknown -> treat as a match (matters on the winning row,
// where the answer's own unknown attribute must not read as wrong). Exactly one
// side unknown -> 'unknown' (can't be compared), never a red "miss".
function cmpText(guess: string | null, secret: string | null): TileState {
  if (guess == null && secret == null) return 'match'
  if (guess == null || secret == null) return 'unknown'
  return norm(guess) === norm(secret) ? 'match' : 'miss'
}

function cmpNum(guess: number | null, secret: number | null): { state: TileState; arrow: Arrow } {
  if (guess == null && secret == null) return { state: 'match', arrow: null }
  if (guess == null || secret == null) return { state: 'unknown', arrow: null }
  if (guess === secret) return { state: 'match', arrow: null }
  const arrow: Arrow = secret > guess ? 'up' : 'down'
  return { state: Math.abs(secret - guess) <= 2 ? 'close' : 'miss', arrow }
}

const TILE_BG: Record<TileState, string> = {
  match:
    'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] ring-emerald-300/70 shadow-sm shadow-emerald-950/40',
  close:
    'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 ring-amber-200/70 shadow-sm shadow-amber-950/30',
  miss: 'bg-gradient-to-br from-ink-750 to-ink-850 text-ink-100 ring-ink-600',
  unknown: 'bg-ink-900/60 italic text-ink-400 ring-ink-800',
}

// For a wrong AGE / SHIRT NUMBER, the tile's own colour tells you which way to go:
// warm rose = the answer is HIGHER (guess too low), cool sky = the answer is LOWER
// (guess too high). Green (exact) and amber (within 2) still win over direction.
const NUM_DIR: Record<'up' | 'down', string> = {
  up: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] ring-rose-300/60 shadow-sm shadow-rose-950/30',
  down: 'bg-gradient-to-br from-sky-400 to-sky-600 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] ring-sky-300/60 shadow-sm shadow-sky-950/30',
}

const BEST_KEY = 'extratime:guess:best'

export function GuessPlayerPage() {
  const [sources, setSources] = useState<Sources>(loadSources)
  const clubs = sources.turkish ? TURKISH_CLUBS : []
  const { data: pool, isLoading, isError, refetch } = useGuessPool(sources.leagues, clubs)
  const [secret, setSecret] = useState<GuessPoolPlayer | null>(null)
  const [guesses, setGuesses] = useState<GuessPoolPlayer[]>([])
  const [term, setTerm] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [best, setBest] = useState<number | null>(() => {
    const raw = safeGetItem(BEST_KEY)
    return raw ? Number(raw) : null
  })
  const won = secret != null && guesses.some((g) => g.playerApiId === secret.playerApiId)
  const outOfGuesses = guesses.length >= MAX_GUESSES && !won
  const finished = won || revealed || outOfGuesses
  const remaining = Math.max(0, MAX_GUESSES - guesses.length)

  function pickSecret(list: GuessPoolPlayer[]) {
    // Draw the answer from the most-prominent slice so it is recognisable.
    const top = Math.min(300, list.length)
    return list[Math.floor(Math.random() * top)]
  }

  // Start a fresh round whenever the pool changes — first load AND whenever the
  // player edits which leagues/clubs feed the game.
  useEffect(() => {
    if (pool && pool.length > 0) {
      setGuesses([])
      setTerm('')
      setRevealed(false)
      setSecret(pickSecret(pool))
    }
  }, [pool])

  function newGame() {
    if (!pool || pool.length === 0) return
    setGuesses([])
    setTerm('')
    setRevealed(false)
    setSecret(pickSecret(pool))
  }

  function toggleLeague(id: number) {
    setSources((s) => {
      const has = s.leagues.includes(id)
      const leagues = has ? s.leagues.filter((x) => x !== id) : [...s.leagues, id]
      if (leagues.length === 0 && !s.turkish) return s // keep at least one source
      const next = { ...s, leagues }
      saveSources(next)
      return next
    })
  }
  function toggleTurkish() {
    setSources((s) => {
      const turkish = !s.turkish
      if (!turkish && s.leagues.length === 0) return s
      const next = { ...s, turkish }
      saveSources(next)
      return next
    })
  }

  // Record best (fewest guesses) on a win.
  useEffect(() => {
    if (won) {
      const count = guesses.length
      setBest((prev) => {
        if (prev == null || count < prev) {
          safeSetItem(BEST_KEY, String(count))
          return count
        }
        return prev
      })
    }
  }, [won, guesses.length])

  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.playerApiId)), [guesses])

  function submit(p: GuessPoolPlayer) {
    if (finished || guessedIds.has(p.playerApiId)) return
    setGuesses((prev) => [p, ...prev])
    setTerm('')
  }

  // Only blank to a skeleton on the very first load — while re-fetching a new pool
  // the previous pool (placeholderData) stays on screen so the controls don't vanish.
  if (isLoading && !pool) return <Skeleton className="h-96" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!pool || pool.length === 0)
    return <EmptyState title="Oyun havuzu boş" description="Oyuncu verisi henüz hazır değil." />

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-label text-brand-300">Kim Bu Oyuncu?</div>
          <h1 className="mt-1 text-2xl font-bold text-ink-100">Gizli oyuncuyu bul</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-400">
            Fotoğraf gizli — sadece ipuçlarıyla bul. Her tahminde uyruk, mevki, takım, lig, yaş
            ve forma numarasını karşılaştıralım (yeşil doğru, sarı yakın, ok yukarıysa aranan
            değer daha büyük). Oyuncunun fotoğrafı ancak doğru bildiğinde ya da hakların bitince açılır.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {best != null && (
            <span className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-300">
              <Trophy className="h-4 w-4 text-brand-300" />
              <span className="tabular-nums">En iyi: {best}</span>
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={newGame}>
            <RotateCcw className="h-4 w-4" />
            Yeni oyuncu
          </Button>
        </div>
      </header>

      <PoolSelector
        leagues={sources.leagues}
        turkishOn={sources.turkish}
        onToggleLeague={toggleLeague}
        onToggleTurkish={toggleTurkish}
      />

      {/* Photo + controls on the left, guesses on the right — so many guesses
          stay visible at once. Stacks to a single column on small screens. */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-20">
          {/* Censored photo of the mystery player — no name/initial leaks. */}
          <Card className="relative flex flex-col items-center gap-3 overflow-hidden p-6">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(100% 55% at 50% 0%, rgba(194,245,66,0.10), transparent 62%)',
              }}
            />
            <div className="relative mx-auto w-full max-w-[290px] rounded-[20px] bg-gradient-to-br from-brand-500/50 via-emerald-500/25 to-sky-500/30 p-[3px] shadow-lg shadow-brand-950/20">
              <MysteryPhoto
                player={secret}
                revealed={finished}
                guessCount={guesses.length}
                maxGuesses={MAX_GUESSES}
              />
            </div>
            {finished ? (
              <div className="relative animate-pop-in text-center">
                <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-ink-100">
                  {won && <Check className="h-5 w-5 text-emerald-400" />}
                  {secret?.name}
                </div>
                <div className="text-sm text-ink-400">
                  {secret ? `${secret.teamName ?? '—'} · ${secret.leagueName}` : ''}
                </div>
                <div className="mt-1 text-sm font-medium text-brand-300">
                  {won
                    ? `${guesses.length} tahminde bildin! 🎉`
                    : outOfGuesses
                      ? 'Hakların bitti — cevap buydu.'
                      : 'Cevap buydu.'}
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: MAX_GUESSES }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-2 w-2 rounded-full transition-colors',
                        i < guesses.length ? 'bg-amber-400' : 'bg-ink-700',
                      )}
                    />
                  ))}
                </div>
                <div className="text-center text-sm text-ink-400">
                  <span className="font-semibold tabular-nums text-brand-300">{remaining}</span>{' '}
                  tahmin hakkın kaldı
                </div>
              </div>
            )}
          </Card>

          {!finished && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setRevealed(true)} disabled={won}>
                <Eye className="h-4 w-4" />
                Pes et
              </Button>
            </div>
          )}

          {finished && (
            <Button className="w-full" onClick={newGame}>
              <RotateCcw className="h-4 w-4" />
              Yeni oyuncuyla oyna
            </Button>
          )}
        </div>

        {/* Guess input above the history, so you type right where results land. */}
        <div className="min-w-0 space-y-4">
          {!finished && (
            <GuessInput term={term} setTerm={setTerm} onPick={submit} guessedIds={guessedIds} />
          )}
          {guesses.length > 0 && secret ? (
            <>
              {/* Desktop: the wide 7-column comparison table. */}
              <Card className="hidden overflow-hidden sm:block">
                <div className="overflow-x-auto">
                  <div className="min-w-180">
                    <GuessHeader />
                    <ul className="divide-y divide-ink-850">
                      {guesses.map((g) => (
                        <GuessRow key={g.playerApiId} guess={g} secret={secret} />
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
              {/* Mobile: stacked cards, no sideways scroll. */}
              <div className="space-y-3 sm:hidden">
                {guesses.map((g) => (
                  <GuessCardMobile key={g.playerApiId} guess={g} secret={secret} />
                ))}
              </div>
            </>
          ) : (
            <Card className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
              <User className="h-9 w-9 text-ink-700" />
              <p className="text-sm text-ink-500">
                Tahminlerin burada listelenecek — her satır uyruk, mevki, takım, lig, yaş ve forma
                numarasını karşılaştırır.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function GuessInput({
  term,
  setTerm,
  onPick,
  guessedIds,
}: {
  term: string
  setTerm: (v: string) => void
  onPick: (p: GuessPoolPlayer) => void
  guessedIds: Set<number>
}) {
  // Debounce so we don't hit the server on every keystroke.
  const [debounced, setDebounced] = useState(term)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 220)
    return () => clearTimeout(t)
  }, [term])

  const { data, isFetching } = useGuessSearch(debounced)
  const suggestions = (data ?? []).filter((p) => !guessedIds.has(p.playerApiId)).slice(0, 10)

  return (
    <Card className="space-y-2 p-4 ring-1 ring-brand-500/20">
      <div className="section-label flex items-center gap-1.5 text-brand-300">
        <Search className="h-3.5 w-3.5" /> Tahminini yaz
      </div>
      <div className="relative">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Oyuncu adı yaz (ör. Bellingham)"
        />
        {term.trim().length >= 2 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 shadow-2xl">
            {suggestions.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-ink-500">
                {isFetching ? 'Aranıyor…' : 'Sonuç bulunamadı.'}
              </li>
            ) : (
              suggestions.map((p) => (
                <li key={p.playerApiId}>
                  {/* No player photo here — while guessing you should recognise the
                      name, not the face. Show the flag, position and club crest so
                      you can pick the right namesake. */}
                  <button
                    onClick={() => onPick(p)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-brand-500/10"
                  >
                    <span className="shrink-0 text-xl leading-none" title={p.nationality ?? undefined}>
                      {flagEmoji(p.nationality) || '🏳️'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-100">{p.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ring-1',
                            posChip(p.position),
                          )}
                        >
                          {posLabel(p.position)}
                        </span>
                        {p.teamName && (
                          <span className="min-w-0 truncate text-[11px] text-ink-500">{p.teamName}</span>
                        )}
                      </span>
                    </span>
                    {p.teamApiId != null && (
                      <TeamLogo apiId={p.teamApiId} size={18} className="shrink-0" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </Card>
  )
}

// PROGRESSIVE reveal: the photo starts heavily blurred and gets clearer with every
// wrong guess, so it's nearly sharp by the last guess — this drip-feed is the whole
// point of the game. Fully clear once solved or given up.
function MysteryPhoto({
  player,
  revealed,
  guessCount,
  maxGuesses,
}: {
  player: GuessPoolPlayer | null
  revealed: boolean
  guessCount: number
  maxGuesses: number
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [player?.playerApiId])

  // 0 at the first guess → 1 by the final guess.
  const t = Math.min(1, guessCount / Math.max(1, maxGuesses - 1))
  const playStyle = {
    filter: `blur(${Math.round((1 - t) * 20 + 2)}px) brightness(${(0.78 + t * 0.22).toFixed(2)}) grayscale(${((1 - t) * 0.45).toFixed(2)})`,
    transform: `scale(${(1.22 - t * 0.14).toFixed(3)})`,
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-ink-700">
      {player?.photoUrl && !failed ? (
        <img
          key={player.playerApiId}
          src={player.photoUrl}
          alt={revealed ? player.name : 'Gizli oyuncu'}
          onError={() => setFailed(true)}
          style={revealed ? undefined : playStyle}
          className="h-full w-full object-cover transition-[filter,transform] duration-500"
          draggable={false}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-b from-ink-800 to-ink-950 text-ink-600">
          <User className="h-24 w-24" />
        </div>
      )}
      {!revealed && (
        <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-0.5 text-xl font-black text-white/80">
          ?
        </span>
      )}
    </div>
  )
}

const COLS = 'grid grid-cols-[1.8fr_1.1fr_1.1fr_1.4fr_1.4fr_0.85fr_0.85fr] gap-2'

function GuessHeader() {
  return (
    <div
      className={cn(
        COLS,
        'border-b border-ink-800 bg-ink-900/50 px-3 py-3 text-xs font-bold uppercase tracking-wider text-ink-400',
      )}
    >
      <span className="flex items-center">Oyuncu</span>
      <span className="text-center">Uyruk</span>
      <span className="text-center">Mevki</span>
      <span className="text-center">Takım</span>
      <span className="text-center">Lig</span>
      <span className="text-center">Yaş</span>
      <span className="text-center">No</span>
    </div>
  )
}

// Every tile is a fixed 56px box; text that doesn't fit is truncated to one line
// and the full value shows as a hover tooltip (title), so boxes never resize.
function Tile({
  state,
  children,
  arrow,
  big,
  title,
}: {
  state: TileState
  children: React.ReactNode
  arrow?: Arrow
  big?: boolean
  title?: string
}) {
  // A wrong number tile colours by direction (rose = go higher, sky = go lower);
  // everything else keeps its state colour.
  const bg = arrow && state === 'miss' ? NUM_DIR[arrow] : TILE_BG[state]
  return (
    <div
      className={cn(
        'flex h-14 items-center justify-center gap-1 overflow-hidden rounded-lg px-1.5 text-center ring-1',
        big ? 'text-xl font-bold' : 'text-sm font-semibold',
        bg,
      )}
      title={title}
    >
      <span className={cn('min-w-0', big ? 'tabular-nums' : 'truncate')}>{children}</span>
      {arrow === 'up' && <ArrowUp className="h-5 w-5 shrink-0" />}
      {arrow === 'down' && <ArrowDown className="h-5 w-5 shrink-0" />}
    </div>
  )
}

// Nationality shows the national-team flag with the country name beneath it.
function NationalityTile({
  state,
  nationality,
}: {
  state: TileState
  nationality: string | null
}) {
  const flag = flagEmoji(nationality)
  return (
    <div
      className={cn(
        'flex h-14 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-1 text-center ring-1',
        TILE_BG[state],
      )}
      title={nationality ?? undefined}
    >
      <span className="text-2xl leading-none">{flag || '🏳️'}</span>
      <span className="w-full min-w-0 truncate text-[10px] font-semibold leading-tight">
        {nationality ?? '—'}
      </span>
    </div>
  )
}

// Team shows the club crest with its name beneath it.
function TeamTile({
  state,
  teamName,
  teamApiId,
}: {
  state: TileState
  teamName: string | null
  teamApiId: number | null
}) {
  return (
    <div
      className={cn(
        'flex h-14 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-1 text-center ring-1',
        TILE_BG[state],
      )}
      title={teamName ?? undefined}
    >
      {teamApiId != null ? (
        <TeamLogo apiId={teamApiId} size={20} />
      ) : (
        <span className="text-base leading-none">⚽</span>
      )}
      <span className="w-full min-w-0 truncate text-[10px] font-semibold leading-tight">
        {teamName ?? '—'}
      </span>
    </div>
  )
}

// The six attribute comparisons for one guess vs the secret — shared by the
// desktop table row and the mobile card so both stay in sync.
function compareGuess(guess: GuessPoolPlayer, secret: GuessPoolPlayer) {
  return {
    nat: cmpText(guess.nationality, secret.nationality),
    pos: cmpText(guess.position, secret.position),
    team: cmpText(guess.teamName, secret.teamName),
    league: cmpText(guess.leagueName, secret.leagueName),
    age: cmpNum(guess.age, secret.age),
    jersey: cmpNum(guess.jerseyNumber, secret.jerseyNumber),
  }
}

// Desktop (≥sm): one wide 7-column table row.
function GuessRow({ guess, secret }: { guess: GuessPoolPlayer; secret: GuessPoolPlayer }) {
  const c = compareGuess(guess, secret)
  return (
    <li className={cn(COLS, 'guess-reveal items-center px-3 py-2.5')}>
      <span className="flex min-w-0 items-center" title={guess.name}>
        <span className="min-w-0 truncate text-base font-semibold text-ink-100">{guess.name}</span>
      </span>
      <NationalityTile state={c.nat} nationality={guess.nationality} />
      <Tile state={c.pos} title={posLabel(guess.position)}>
        {posLabel(guess.position)}
      </Tile>
      <TeamTile state={c.team} teamName={guess.teamName} teamApiId={guess.teamApiId} />
      <Tile state={c.league} title={guess.leagueName}>
        {guess.leagueName}
      </Tile>
      <Tile state={c.age.state} arrow={c.age.arrow} big>
        {guess.age ?? '—'}
      </Tile>
      <Tile state={c.jersey.state} arrow={c.jersey.arrow} big>
        {guess.jerseyNumber ?? '?'}
      </Tile>
    </li>
  )
}

function LabeledTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      {children}
    </div>
  )
}

// Mobile (<sm): a stacked card so all six attributes are visible without the
// 720px sideways scroll the table needs.
function GuessCardMobile({ guess, secret }: { guess: GuessPoolPlayer; secret: GuessPoolPlayer }) {
  const c = compareGuess(guess, secret)
  return (
    <div className="animate-guess-in rounded-xl border border-ink-800 bg-ink-900/60 p-3">
      <div className="mb-2 truncate text-base font-bold text-ink-100" title={guess.name}>
        {guess.name}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <LabeledTile label="Uyruk">
          <NationalityTile state={c.nat} nationality={guess.nationality} />
        </LabeledTile>
        <LabeledTile label="Mevki">
          <Tile state={c.pos} title={posLabel(guess.position)}>
            {posLabel(guess.position)}
          </Tile>
        </LabeledTile>
        <LabeledTile label="Takım">
          <TeamTile state={c.team} teamName={guess.teamName} teamApiId={guess.teamApiId} />
        </LabeledTile>
        <LabeledTile label="Lig">
          <Tile state={c.league} title={guess.leagueName}>
            {guess.leagueName}
          </Tile>
        </LabeledTile>
        <LabeledTile label="Yaş">
          <Tile state={c.age.state} arrow={c.age.arrow} big>
            {guess.age ?? '—'}
          </Tile>
        </LabeledTile>
        <LabeledTile label="No">
          <Tile state={c.jersey.state} arrow={c.jersey.arrow} big>
            {guess.jerseyNumber ?? '?'}
          </Tile>
        </LabeledTile>
      </div>
    </div>
  )
}
