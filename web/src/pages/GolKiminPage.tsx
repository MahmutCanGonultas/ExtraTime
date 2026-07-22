import { useEffect, useMemo, useState } from 'react'
import { Goal, Check, X, Share2, Trophy, ChevronRight } from 'lucide-react'
import { TeamLogo } from '@/components/TeamLogo'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { useGoalQuiz, useGoalGuess } from '@/features/games/hooks'
import { ArenaShell, GAME_THEMES, GameHero, GlassPanel } from '@/features/games/ui'
import type { GoalQuestion } from '@/features/games/types'

const THEME = GAME_THEMES.gol

type Answer = { choice: string; correct: boolean; scorer: string | null }

export default function GolKiminPage() {
  const { data, isLoading, isError } = useGoalQuiz()

  return (
    <ArenaShell theme={THEME} maxW="max-w-lg">
      <GameHero
        theme={THEME}
        icon={Goal}
        title="Gol Kimin?"
        subtitle="Maç, skor ve dakika verilir — golü kim attı?"
      />
      {isLoading ? (
        <div className="grid h-72 place-items-center text-white/50">Yükleniyor…</div>
      ) : isError || !data || data.questions.length === 0 ? (
        <div className="grid h-72 place-items-center text-white/50">Quiz yüklenemedi.</div>
      ) : (
        <Quiz date={data.date} questions={data.questions} />
      )}
    </ArenaShell>
  )
}

function Quiz({ date, questions }: { date: string; questions: GoalQuestion[] }) {
  const storageKey = `gol-kimin:${date}`
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [idx, setIdx] = useState(0)
  const guess = useGoalGuess()

  useEffect(() => {
    const raw = safeGetItem(storageKey)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Record<number, Answer>
        setAnswers(saved)
        const firstUnanswered = questions.findIndex((q) => !saved[q.eventId])
        setIdx(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered)
      } catch {
        /* ignore */
      }
    }
  }, [storageKey, questions])

  const q = questions[idx]
  const current = answers[q.eventId]
  const answeredCount = Object.keys(answers).length
  const score = Object.values(answers).filter((a) => a.correct).length
  const allDone = answeredCount >= questions.length

  async function pick(choice: string) {
    if (current || guess.isPending) return
    const res = await guess.mutateAsync({ eventId: q.eventId, choice })
    const next = { ...answers, [q.eventId]: { choice, correct: res.correct, scorer: res.scorer } }
    setAnswers(next)
    safeSetItem(storageKey, JSON.stringify(next))
  }

  const shareText = useMemo(() => {
    if (!allDone) return ''
    let out = `Gol Kimin? ${date}\n`
    out += questions.map((qq) => (answers[qq.eventId]?.correct ? '🟢' : '🔴')).join('')
    out += `\n${score}/${questions.length} doğru`
    return out
  }, [allDone, answers, questions, date, score])

  if (allDone) {
    return (
      <div className="space-y-4">
        <ScoreBar answered={answeredCount} total={questions.length} score={score} />
        <GlassPanel glow={THEME.glow2} className="p-5 text-center">
          <Trophy className="mx-auto mb-1 h-8 w-8 text-amber-300" />
          <div className="font-display text-3xl font-bold uppercase tracking-wide text-white">
            {score}/{questions.length}
          </div>
          <p className="mt-0.5 text-sm text-white/60">
            {score === questions.length
              ? 'Kusursuz! Gol kralı sensin ⚽'
              : score >= questions.length * 0.7
                ? 'Çok iyi!'
                : score >= questions.length * 0.4
                  ? 'Fena değil.'
                  : 'Yarın tekrar dene.'}
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(shareText).catch(() => {})}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </GlassPanel>

        <ul className="space-y-2">
          {questions.map((qq, i) => {
            const a = answers[qq.eventId]
            return (
              <li
                key={qq.eventId}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2 text-sm backdrop-blur-sm',
                  a?.correct ? 'border-emerald-400/30 bg-emerald-500/[0.08]' : 'border-rose-400/30 bg-rose-500/[0.08]',
                )}
              >
                <span className="w-5 text-center text-xs font-bold text-white/40">{i + 1}</span>
                <TeamLogo apiId={qq.home.apiId} size={18} />
                <span className="tabular-nums text-white/50">
                  {qq.homeScore}-{qq.awayScore}
                </span>
                <TeamLogo apiId={qq.away.apiId} size={18} />
                <span className="ml-auto font-semibold text-white">{a?.scorer}</span>
                {a?.correct ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-rose-400" />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ScoreBar answered={answeredCount} total={questions.length} score={score} />
      <QuestionCard q={q} answer={current} pending={guess.isPending} onPick={pick} onNext={() => setIdx((i) => Math.min(i + 1, questions.length - 1))} />
    </div>
  )
}

function ScoreBar({ answered, total, score }: { answered: number; total: number; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition',
              i < answered ? 'bg-gradient-to-r from-orange-400 to-rose-500' : 'bg-white/10',
            )}
          />
        ))}
      </div>
      <span className="shrink-0 font-display text-lg font-bold tabular-nums text-amber-300">
        {score}/{total}
      </span>
    </div>
  )
}

function QuestionCard({
  q,
  answer,
  pending,
  onPick,
  onNext,
}: {
  q: GoalQuestion
  answer?: Answer
  pending: boolean
  onPick: (choice: string) => void
  onNext: () => void
}) {
  const minuteLabel = q.minute != null ? `${q.minute}${q.extraMinute ? `+${q.extraMinute}` : ''}'` : 'GOL'
  const scoringHome = q.scoringSide === 'home'
  // After this goal the scoring side leads / is level / still trails.
  const lead =
    q.scoredHome === q.scoredAway
      ? 'eşitledi'
      : (scoringHome ? q.scoredHome > q.scoredAway : q.scoredAway > q.scoredHome)
        ? 'öne geçti'
        : 'farkı azalttı'

  return (
    <GlassPanel glow={THEME.glow1} className="overflow-hidden">
      {/* Match header — the score AT THE MOMENT of the goal, scoring side lit up */}
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-5">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <div className={cn('rounded-full p-0.5', scoringHome && 'bg-orange-400/20 ring-2 ring-orange-400/60')}>
              <TeamLogo apiId={q.home.apiId} size={44} />
            </div>
            <span className="line-clamp-1 text-center text-xs font-medium text-white/70">{q.home.name}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="font-display text-4xl font-black tabular-nums text-white">
              <span className={cn(scoringHome && 'text-orange-300')}>{q.scoredHome}</span>
              <span className="mx-1 text-white/30">-</span>
              <span className={cn(!scoringHome && 'text-orange-300')}>{q.scoredAway}</span>
            </div>
            <span className="mt-1 rounded-full bg-gradient-to-r from-orange-500/30 to-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-orange-200 ring-1 ring-orange-400/30">
              ⚽ {minuteLabel}
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <div className={cn('rounded-full p-0.5', !scoringHome && 'bg-orange-400/20 ring-2 ring-orange-400/60')}>
              <TeamLogo apiId={q.away.apiId} size={44} />
            </div>
            <span className="line-clamp-1 text-center text-xs font-medium text-white/70">{q.away.name}</span>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-white/45">
          <span className="font-semibold text-orange-200">{scoringHome ? q.home.name : q.away.name}</span> bu golle{' '}
          {lead} · maç sonu {q.homeScore}-{q.awayScore}
        </p>
      </div>

      <div className="p-4">
        <p className="mb-3 text-center text-sm text-white/60">
          Bu golü <span className="font-semibold text-white">kim</span> attı?
        </p>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isChosen = answer?.choice === opt
            const isCorrectOpt = answer && answer.scorer === opt
            let tone = 'border-white/10 bg-white/[0.03] hover:border-orange-400/60 hover:bg-white/[0.07]'
            if (answer) {
              if (isCorrectOpt) tone = 'border-emerald-400/50 bg-emerald-500/15'
              else if (isChosen) tone = 'border-rose-400/50 bg-rose-500/15'
              else tone = 'border-white/5 bg-white/[0.02] opacity-50'
            }
            return (
              <button
                key={opt}
                disabled={!!answer || pending}
                onClick={() => onPick(opt)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold text-white transition',
                  tone,
                )}
              >
                <span>{opt}</span>
                {answer && isCorrectOpt && <Check className="h-5 w-5 text-emerald-400" />}
                {answer && isChosen && !isCorrectOpt && <X className="h-5 w-5 text-rose-400" />}
              </button>
            )
          })}
        </div>

        {answer && (
          <button
            onClick={onNext}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            Sonraki <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </GlassPanel>
  )
}
