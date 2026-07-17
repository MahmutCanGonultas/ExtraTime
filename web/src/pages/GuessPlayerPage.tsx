import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, RotateCcw, Eye, Trophy, User, Check, Search } from 'lucide-react'
import { useGuessPool, useGuessSearch } from '@/features/football/hooks'
import type { GuessPoolPlayer } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/cn'

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

// How censored the photo is: fully blurred at the start, opening a little with
// each wrong guess, fully clear once the round is over.
const MAX_GUESSES = 8
const BASE_BLUR = 16
const BLUR_STEP = 2 // opens a bit faster per wrong guess
const MIN_BLUR = 4 // but never fully clears during play — only when solved / given up
function blurFor(wrongGuesses: number, finished: boolean): number {
  if (finished) return 0
  return Math.max(MIN_BLUR, BASE_BLUR - wrongGuesses * BLUR_STEP)
}

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

const BEST_KEY = 'extratime:guess:best'

export function GuessPlayerPage() {
  const { data: pool, isLoading, isError, refetch } = useGuessPool()
  const [secret, setSecret] = useState<GuessPoolPlayer | null>(null)
  const [guesses, setGuesses] = useState<GuessPoolPlayer[]>([])
  const [term, setTerm] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [best, setBest] = useState<number | null>(() => {
    const raw = safeGetItem(BEST_KEY)
    return raw ? Number(raw) : null
  })
  const startedRef = useRef(false)

  const won = secret != null && guesses.some((g) => g.playerApiId === secret.playerApiId)
  const outOfGuesses = guesses.length >= MAX_GUESSES && !won
  const finished = won || revealed || outOfGuesses
  const remaining = Math.max(0, MAX_GUESSES - guesses.length)
  // Guesses that were not the answer — drives how far the photo has opened.
  const wrongCount = secret ? guesses.filter((g) => g.playerApiId !== secret.playerApiId).length : 0

  function pickSecret(list: GuessPoolPlayer[]) {
    // Draw the answer from the most-prominent slice so it is recognisable.
    const top = Math.min(300, list.length)
    return list[Math.floor(Math.random() * top)]
  }

  useEffect(() => {
    if (pool && pool.length > 0 && !startedRef.current) {
      startedRef.current = true
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

  if (isLoading) return <Skeleton className="h-96" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!pool || pool.length === 0)
    return <EmptyState title="Oyun havuzu boş" description="Oyuncu verisi henüz hazır değil." />

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-label text-brand-300">Kim Bu Oyuncu?</div>
          <h1 className="mt-1 text-2xl font-bold text-ink-100">Fotoğraftan oyuncuyu bul</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-400">
            Fotoğraf sansürlü başlar, her yanlış tahminde biraz daha açılır. Tahmininde uyruk,
            mevki, takım, lig, yaş ve forma numarasını karşılaştıralım — yeşil doğru, sarı yakın,
            ok yukarıysa aranan değer daha büyük.
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

      {/* Photo + controls on the left, guesses on the right — so many guesses
          stay visible at once. Stacks to a single column on small screens. */}
      <div className="grid gap-5 lg:grid-cols-[420px_1fr] lg:items-start">
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
            <div className="relative rounded-[20px] bg-gradient-to-br from-brand-500/50 via-emerald-500/25 to-sky-500/30 p-[3px] shadow-lg shadow-brand-950/20">
              <MysteryPhoto player={secret} blur={blurFor(wrongCount, finished)} revealed={finished} />
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
            <Card className="overflow-hidden">
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
                  <button
                    onClick={() => onPick(p)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink-800"
                  >
                    <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink-100">{p.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-ink-400">
                        {p.teamApiId != null && <TeamLogo apiId={p.teamApiId} size={14} />}
                        <span className="truncate">{p.teamName ?? '—'}</span>
                      </span>
                    </span>
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

function MysteryPhoto({
  player,
  blur,
  revealed,
}: {
  player: GuessPoolPlayer | null
  blur: number
  revealed: boolean
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [player?.playerApiId])

  return (
    <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-ink-700">
      {player?.photoUrl && !failed ? (
        <img
          src={player.photoUrl}
          alt="Gizli oyuncu"
          onError={() => setFailed(true)}
          // Scale up a touch so the blur has no hard edges while censored.
          style={{ filter: blur > 0 ? `blur(${blur}px)` : 'none', transform: blur > 0 ? 'scale(1.15)' : 'none' }}
          className="h-full w-full object-cover transition-[filter,transform] duration-500"
          draggable={false}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-ink-600">
          <User className="h-20 w-20" />
        </div>
      )}
      {!revealed && (
        <span className="absolute bottom-1.5 right-1.5 rounded-lg bg-ink-950/70 px-2 py-0.5 text-xl font-bold text-white">
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
  return (
    <div
      className={cn(
        'flex h-14 items-center justify-center gap-1 overflow-hidden rounded-lg px-1.5 text-center ring-1',
        big ? 'text-xl font-bold' : 'text-sm font-semibold',
        TILE_BG[state],
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

function GuessRow({ guess, secret }: { guess: GuessPoolPlayer; secret: GuessPoolPlayer }) {
  const nat = cmpText(guess.nationality, secret.nationality)
  const pos = cmpText(guess.position, secret.position)
  const team = cmpText(guess.teamName, secret.teamName)
  const league = cmpText(guess.leagueName, secret.leagueName)
  const age = cmpNum(guess.age, secret.age)
  const jersey = cmpNum(guess.jerseyNumber, secret.jerseyNumber)

  return (
    <li className={cn(COLS, 'animate-guess-in items-center px-3 py-2.5')}>
      <span className="flex min-w-0 items-center gap-2.5" title={guess.name}>
        <PlayerAvatar playerApiId={guess.playerApiId} name={guess.name} size={38} />
        <span className="min-w-0 truncate text-base font-semibold text-ink-100">{guess.name}</span>
      </span>
      <NationalityTile state={nat} nationality={guess.nationality} />
      <Tile state={pos} title={posLabel(guess.position)}>
        {posLabel(guess.position)}
      </Tile>
      <TeamTile state={team} teamName={guess.teamName} teamApiId={guess.teamApiId} />
      <Tile state={league} title={guess.leagueName}>
        {guess.leagueName}
      </Tile>
      <Tile state={age.state} arrow={age.arrow} big>
        {guess.age ?? '—'}
      </Tile>
      <Tile state={jersey.state} arrow={jersey.arrow} big>
        {guess.jerseyNumber ?? '?'}
      </Tile>
    </li>
  )
}
