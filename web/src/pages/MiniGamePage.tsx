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
const BEST_KEY = 'goalduel_best'

// Standalone mini-game, independent of the prediction game: given two players,
// guess who scored more league goals this season. One wrong answer ends the run.
export function MiniGamePage() {
  const { data: pool, isLoading, isError, refetch } = useGamePool()
  const [pair, setPair] = useState<Pair | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [over, setOver] = useState(false)

  const draw = useCallback((p: GamePoolPlayer[]): Pair | null => {
    for (let i = 0; i < 60; i++) {
      const a = p[Math.floor(Math.random() * p.length)]
      const b = p[Math.floor(Math.random() * p.length)]
      if (a.playerApiId !== b.playerApiId && a.goals !== b.goals) return [a, b]
    }
    return null
  }, [])

  useEffect(() => {
    if (pool && pool.length > 1 && !pair && !over) setPair(draw(pool))
  }, [pool, pair, over, draw])

  function restart() {
    setScore(0)
    setOver(false)
    setPicked(null)
    setPair(pool ? draw(pool) : null)
  }

  function pick(i: number) {
    if (picked !== null || !pair) return
    setPicked(i)
    const correct = pair[i].goals > pair[1 - i].goals
    if (correct) {
      window.setTimeout(() => {
        setScore((s) => s + 1)
        setPicked(null)
        setPair(pool ? draw(pool) : null)
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
          <p className="text-sm text-ink-400">
            Bu sezon hangisi daha çok gol attı? Üst üste kaç bilebilirsin?
          </p>
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
      ) : !pair ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-4">
          <PlayerCard
            player={pair[0]}
            revealed={picked !== null}
            state={cardState(pair, 0, picked)}
            onPick={() => pick(0)}
          />
          <div className="flex items-center justify-center">
            <span className="score-num rounded-full border border-ink-700 bg-ink-900 px-3 py-2 text-sm font-bold text-ink-400">
              VS
            </span>
          </div>
          <PlayerCard
            player={pair[1]}
            revealed={picked !== null}
            state={cardState(pair, 1, picked)}
            onPick={() => pick(1)}
          />
        </div>
      )}

      {!over && (
        <p className="mt-4 text-center text-xs text-ink-500">
          Goller {new Date().getFullYear() - 1}/{String(new Date().getFullYear() % 100).padStart(2, '0')} sezonu
          lig gollerini gösterir.
        </p>
      )}
    </div>
  )
}

function cardState(pair: Pair, i: number, picked: number | null): 'idle' | 'win' | 'lose' {
  if (picked === null) return 'idle'
  return pair[i].goals > pair[1 - i].goals ? 'win' : 'lose'
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
  revealed,
  state,
  onPick,
}: {
  player: GamePoolPlayer
  revealed: boolean
  state: 'idle' | 'win' | 'lose'
  onPick: () => void
}) {
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
        <div className="score-num text-3xl font-extrabold text-brand-300">{player.goals}</div>
      ) : (
        <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Seç</div>
      )}
    </button>
  )
}
