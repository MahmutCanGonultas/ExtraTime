import { useCallback, useEffect, useState } from 'react'
import { Trophy, Flame, CalendarDays, CheckCircle2, XCircle } from 'lucide-react'
import { useGamePool } from '@/features/football/hooks'
import type { GamePoolPlayer } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, ErrorState } from '@/components/ui/feedback'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { cn } from '@/lib/cn'

const DAILY_COUNT = 10
const DAILY_KEY = 'duel_daily'
const BEST_KEY = 'duel_best'

interface Metric {
  key: string
  duel: string
  quad: string
  get: (p: GamePoolPlayer) => number | null
  fmt: (v: number) => string
}
const METRICS: Metric[] = [
  { key: 'goals', duel: 'Hangisi bu sezon daha çok GOL attı?', quad: 'Hangisi bu sezon en çok GOL attı?', get: (p) => p.goals, fmt: (v) => String(v) },
  { key: 'assists', duel: 'Hangisi daha çok ASİST yaptı?', quad: 'Hangisi en çok ASİST yaptı?', get: (p) => p.assists, fmt: (v) => String(v) },
  { key: 'rating', duel: 'Hangisinin REYTİNGİ daha yüksek?', quad: 'Hangisinin REYTİNGİ en yüksek?', get: (p) => p.rating, fmt: (v) => v.toFixed(2) },
  { key: 'apps', duel: 'Hangisi daha çok MAÇA çıktı?', quad: 'Hangisi en çok MAÇA çıktı?', get: (p) => p.appearances, fmt: (v) => String(v) },
  { key: 'minutes', duel: 'Hangisi daha çok DAKİKA oynadı?', quad: 'Hangisi en çok DAKİKA oynadı?', get: (p) => p.minutes, fmt: (v) => `${v}′` },
]

interface Question {
  mode: 'duel' | 'trio'
  metric: Metric
  players: GamePoolPlayer[]
  correct: number // index of the leader
  question: string
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// Build one question: 2 (duel) or 4 (quad) players with distinct, non-null values
// for a random stat, so exactly one is the leader.
function buildQuestion(pool: GamePoolPlayer[]): Question | null {
  const mode: 'duel' | 'trio' = Math.random() < 0.5 ? 'duel' : 'trio'
  const size = mode === 'duel' ? 2 : 3
  const metric = METRICS[Math.floor(Math.random() * METRICS.length)]
  for (let attempt = 0; attempt < 120; attempt++) {
    const chosen: GamePoolPlayer[] = []
    const ids = new Set<number>()
    const vals = new Set<number>()
    for (let i = 0; i < pool.length && chosen.length < size; i++) {
      const p = pool[Math.floor(Math.random() * pool.length)]
      const v = metric.get(p)
      if (v == null || ids.has(p.playerApiId) || vals.has(v)) continue
      ids.add(p.playerApiId)
      vals.add(v)
      chosen.push(p)
    }
    if (chosen.length === size) {
      let correct = 0
      for (let i = 1; i < chosen.length; i++) {
        if ((metric.get(chosen[i]) ?? 0) > (metric.get(chosen[correct]) ?? 0)) correct = i
      }
      return { mode, metric, players: chosen, correct, question: mode === 'duel' ? metric.duel : metric.quad }
    }
  }
  return null
}

export function MiniGamePage() {
  const { data: pool, isLoading, isError, refetch } = useGamePool()
  const day = today()

  const [done, setDone] = useState<{ date: string; score: number } | null>(() => {
    try {
      const d = JSON.parse(safeGetItem(DAILY_KEY) || 'null')
      return d && d.date === day ? d : null
    } catch {
      return null
    }
  })
  const [best, setBest] = useState(() => Number(safeGetItem(BEST_KEY) || 0))

  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  const buildAll = useCallback((p: GamePoolPlayer[]) => {
    const qs: Question[] = []
    for (let i = 0; i < DAILY_COUNT * 4 && qs.length < DAILY_COUNT; i++) {
      const q = buildQuestion(p)
      if (q) qs.push(q)
    }
    return qs
  }, [])

  useEffect(() => {
    if (pool && pool.length > 4 && !done && questions.length === 0) {
      setQuestions(buildAll(pool))
    }
  }, [pool, done, questions.length, buildAll])

  const current = questions[index]

  function pick(i: number) {
    if (picked !== null || !current) return
    setPicked(i)
    const correct = i === current.correct
    window.setTimeout(() => {
      const nextScore = score + (correct ? 1 : 0)
      if (index + 1 >= questions.length) {
        // finish the daily challenge
        const rec = { date: day, score: nextScore }
        safeSetItem(DAILY_KEY, JSON.stringify(rec))
        const nb = Math.max(best, nextScore)
        safeSetItem(BEST_KEY, String(nb))
        setBest(nb)
        setScore(nextScore)
        setDone(rec)
      } else {
        setScore(nextScore)
        setIndex(index + 1)
        setPicked(null)
      }
    }, 1050)
  }

  if (isLoading) return <Skeleton className="h-96" />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-100">Gol Düellosu</h1>
          <p className="flex items-center gap-1.5 text-sm text-ink-400">
            <CalendarDays className="h-4 w-4" /> Günlük meydan okuma · {DAILY_COUNT} soru
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!done && (
            <Stat icon={<Flame className="h-4 w-4 text-brand-400" />} label="Doğru" value={score} />
          )}
          <Stat icon={<Trophy className="h-4 w-4 text-amber-300" />} label="Rekor" value={best} suffix={`/${DAILY_COUNT}`} />
        </div>
      </div>

      {done ? (
        <DailyResult score={done.score} best={best} />
      ) : !current ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <Progress index={index} total={questions.length} />
          <div className="mb-3 mt-4 text-center text-lg font-semibold text-ink-100">{current.question}</div>
          {current.mode === 'duel' ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-4">
              <PlayerCard q={current} i={0} picked={picked} onPick={() => pick(0)} big />
              <div className="flex items-center justify-center">
                <span className="score-num rounded-full border border-ink-700 bg-ink-900 px-3 py-2 text-sm font-bold text-ink-400">
                  VS
                </span>
              </div>
              <PlayerCard q={current} i={1} picked={picked} onPick={() => pick(1)} big />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {current.players.map((_, i) => (
                <PlayerCard key={i} q={current} i={i} picked={picked} onPick={() => pick(i)} />
              ))}
            </div>
          )}
        </>
      )}

      {!done && (
        <p className="mt-4 text-center text-xs text-ink-500">
          İstatistikler 2025/26 sezonu Avrupa'nın 6 büyük ligini kapsar.
        </p>
      )}
    </div>
  )
}

function DailyResult({ score, best }: { score: number; best: number }) {
  const msg =
    score >= 9 ? 'Efsane!' : score >= 7 ? 'Çok iyi!' : score >= 5 ? 'Fena değil.' : 'Yarın daha iyisi!'
  return (
    <Card>
      <CardBody className="py-10 text-center">
        <div className="text-sm uppercase tracking-wide text-ink-400">Bugünkü meydan okuma tamamlandı</div>
        <div className="score-num mt-2 text-5xl font-extrabold text-ink-100">
          {score}
          <span className="text-2xl text-ink-500">/{DAILY_COUNT}</span>
        </div>
        <div className="mt-1 text-sm text-brand-300">{msg}</div>
        <div className="mt-1 text-sm text-ink-400">rekor {best}/{DAILY_COUNT}</div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-4 py-2 text-sm text-ink-300">
          <CalendarDays className="h-4 w-4 text-brand-300" /> Yarın {DAILY_COUNT} yeni soru
        </div>
      </CardBody>
    </Card>
  )
}

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-ink-500">
        <span>Soru {index + 1}/{total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>
    </div>
  )
}

function Stat({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-ink-500">
        {icon}
        {label}
      </div>
      <div className="score-num text-2xl font-bold text-ink-100">
        {value}
        {suffix && <span className="text-sm text-ink-500">{suffix}</span>}
      </div>
    </div>
  )
}

function PlayerCard({
  q,
  i,
  picked,
  onPick,
  big,
}: {
  q: Question
  i: number
  picked: number | null
  onPick: () => void
  big?: boolean
}) {
  const player = q.players[i]
  const revealed = picked !== null
  const isCorrect = i === q.correct
  const isPicked = picked === i
  const value = q.metric.get(player)
  return (
    <button
      onClick={onPick}
      disabled={revealed}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-card border bg-ink-900 px-3 text-center transition',
        big ? 'py-6' : 'py-4',
        !revealed && 'border-ink-800 hover:border-brand-500 hover:bg-ink-850',
        revealed && isCorrect && 'border-brand-500 bg-brand-500/10',
        revealed && !isCorrect && isPicked && 'border-loss/50 bg-loss/5',
        revealed && !isCorrect && !isPicked && 'border-ink-800 opacity-55',
      )}
    >
      {revealed && (isCorrect || isPicked) && (
        <span className="absolute right-2 top-2">
          {isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-brand-400" />
          ) : (
            <XCircle className="h-5 w-5 text-loss" />
          )}
        </span>
      )}
      <PlayerAvatar playerApiId={player.playerApiId} name={player.name} size={big ? 104 : 72} />
      <div className="flex items-center gap-1.5">
        {player.teamApiId != null && <TeamLogo apiId={player.teamApiId} size={14} />}
        <span className="truncate text-xs text-ink-400">{player.teamName}</span>
      </div>
      <div className={cn('font-semibold text-ink-100', big ? 'text-base' : 'text-sm')}>{player.name}</div>
      {revealed ? (
        <div className={cn('score-num font-extrabold text-brand-300', big ? 'text-3xl' : 'text-xl')}>
          {value != null ? q.metric.fmt(value) : '—'}
        </div>
      ) : (
        <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Seç</div>
      )}
    </button>
  )
}
