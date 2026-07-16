import { useCallback, useEffect, useState } from 'react'
import { Trophy, RotateCcw, Flame } from 'lucide-react'
import { useGamePool } from '@/features/football/hooks'
import type { GamePoolPlayer } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, ErrorState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

type Pair = [GamePoolPlayer, GamePoolPlayer]

// Each round asks about a different stat, not only goals.
interface Metric {
  key: string
  question: string
  get: (p: GamePoolPlayer) => number | null
  fmt: (v: number) => string
}
const METRICS: Metric[] = [
  { key: 'goals', question: 'Hangisi bu sezon daha çok GOL attı?', get: (p) => p.goals, fmt: (v) => String(v) },
  { key: 'assists', question: 'Hangisi bu sezon daha çok ASİST yaptı?', get: (p) => p.assists, fmt: (v) => String(v) },
  { key: 'rating', question: 'Hangisinin sezon REYTİNGİ daha yüksek?', get: (p) => p.rating, fmt: (v) => v.toFixed(2) },
  { key: 'apps', question: 'Hangisi bu sezon daha çok MAÇA çıktı?', get: (p) => p.appearances, fmt: (v) => String(v) },
  { key: 'minutes', question: 'Hangisi daha çok DAKİKA oynadı?', get: (p) => p.minutes, fmt: (v) => `${v}′` },
]
const GOALS = METRICS[0]

const BEST_KEY = 'goalduel_best'

interface Round {
  pair: Pair
  metric: Metric
}

// Standalone mini-game, independent of the prediction game: given two players,
// guess who leads on a randomly chosen stat this season. One wrong answer ends
// the run. The player pool leans toward top-5 teams so names are recognisable.
export function MiniGamePage() {
  const { data: pool, isLoading, isError, refetch } = useGamePool()
  const [round, setRound] = useState<Round | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [over, setOver] = useState(false)

  const nextRound = useCallback((p: GamePoolPlayer[]): Round | null => {
    const order = [METRICS[Math.floor(Math.random() * METRICS.length)], GOALS]
    for (const metric of order) {
      for (let i = 0; i < 80; i++) {
        const a = p[Math.floor(Math.random() * p.length)]
        const b = p[Math.floor(Math.random() * p.length)]
        const av = metric.get(a)
        const bv = metric.get(b)
        if (a.playerApiId !== b.playerApiId && av != null && bv != null && av !== bv) {
          return { pair: [a, b], metric }
        }
      }
    }
    return null
  }, [])

  useEffect(() => {
    if (pool && pool.length > 1 && !round && !over) setRound(nextRound(pool))
  }, [pool, round, over, nextRound])

  function restart() {
    setScore(0)
    setOver(false)
    setPicked(null)
    setRound(pool ? nextRound(pool) : null)
  }

  function pick(i: number) {
    if (picked !== null || !round) return
    setPicked(i)
    const { pair, metric } = round
    const correct = (metric.get(pair[i]) ?? 0) > (metric.get(pair[1 - i]) ?? 0)
    if (correct) {
      window.setTimeout(() => {
        setScore((s) => s + 1)
        setPicked(null)
        setRound(pool ? nextRound(pool) : null)
      }, 1050)
    } else {
      const nb = Math.max(best, score)
      localStorage.setItem(BEST_KEY, String(nb))
      setBest(nb)
      window.setTimeout(() => setOver(true), 1050)
    }
  }

  if (isLoading) return <Skeleton className="h-96" />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-100">Gol Düellosu</h1>
          <p className="text-sm text-ink-400">İki oyuncu, değişen bir istatistik. Üst üste kaç bilebilirsin?</p>
        </div>
        <div className="flex items-center gap-4">
          <Stat icon={<Flame className="h-4 w-4 text-brand-400" />} label="Seri" value={score} />
          <Stat icon={<Trophy className="h-4 w-4 text-amber-300" />} label="Rekor" value={best} />
        </div>
      </div>

      {over ? (
        <Card>
          <CardBody className="py-10 text-center">
            <div className="text-sm uppercase tracking-wide text-ink-400">Oyun bitti</div>
            <div className="score-num mt-2 text-5xl font-extrabold text-ink-100">{score}</div>
            <div className="mt-1 text-sm text-ink-400">doğru tahmin · rekor {best}</div>
            <Button className="mt-6" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> Tekrar oyna
            </Button>
          </CardBody>
        </Card>
      ) : !round ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <div className="mb-3 text-center text-lg font-semibold text-ink-100">{round.metric.question}</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-4">
            <PlayerCard
              player={round.pair[0]}
              metric={round.metric}
              revealed={picked !== null}
              state={cardState(round, 0, picked)}
              onPick={() => pick(0)}
            />
            <div className="flex items-center justify-center">
              <span className="score-num rounded-full border border-ink-700 bg-ink-900 px-3 py-2 text-sm font-bold text-ink-400">
                VS
              </span>
            </div>
            <PlayerCard
              player={round.pair[1]}
              metric={round.metric}
              revealed={picked !== null}
              state={cardState(round, 1, picked)}
              onPick={() => pick(1)}
            />
          </div>
        </>
      )}

      {!over && (
        <p className="mt-4 text-center text-xs text-ink-500">
          İstatistikler 2025/26 sezonu Avrupa'nın 6 büyük ligini kapsar.
        </p>
      )}
    </div>
  )
}

function cardState({ pair, metric }: Round, i: number, picked: number | null): 'idle' | 'win' | 'lose' {
  if (picked === null) return 'idle'
  return (metric.get(pair[i]) ?? 0) > (metric.get(pair[1 - i]) ?? 0) ? 'win' : 'lose'
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-ink-500">
        {icon}
        {label}
      </div>
      <div className="score-num text-2xl font-bold text-ink-100">{value}</div>
    </div>
  )
}

function PlayerCard({
  player,
  metric,
  revealed,
  state,
  onPick,
}: {
  player: GamePoolPlayer
  metric: Metric
  revealed: boolean
  state: 'idle' | 'win' | 'lose'
  onPick: () => void
}) {
  const raw = metric.get(player)
  return (
    <button
      onClick={onPick}
      disabled={revealed}
      className={cn(
        'flex flex-col items-center gap-2 rounded-card border bg-ink-900 px-3 py-6 text-center transition',
        !revealed && 'border-ink-800 hover:border-brand-500 hover:bg-ink-850',
        revealed && state === 'win' && 'border-brand-500 bg-brand-500/10',
        revealed && state === 'lose' && 'border-loss/40 opacity-70',
      )}
    >
      <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={104} />
      <div className="mt-1 flex items-center gap-1.5">
        {player.teamApiId != null && <TeamLogo apiId={player.teamApiId} size={16} />}
        <span className="text-xs text-ink-400">{player.teamName}</span>
      </div>
      <div className="font-semibold text-ink-100">{player.name}</div>
      {revealed ? (
        <div className="score-num text-3xl font-extrabold text-brand-300">
          {raw != null ? metric.fmt(raw) : '—'}
        </div>
      ) : (
        <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Seç</div>
      )}
    </button>
  )
}
