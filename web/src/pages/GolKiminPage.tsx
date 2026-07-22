import { useEffect, useMemo, useState } from 'react'
import { Goal, Check, X, Share2, Trophy, ChevronRight } from 'lucide-react'
import { TeamLogo } from '@/components/TeamLogo'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { useGoalQuiz, useGoalGuess } from '@/features/games/hooks'
import type { GoalQuestion } from '@/features/games/types'

type Answer = { choice: string; correct: boolean; scorer: string | null }

export default function GolKiminPage() {
  const { data, isLoading, isError } = useGoalQuiz()

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-900/40">
          <Goal className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink-50">Gol Kimin?</h1>
          <p className="text-sm text-ink-400">Maç, skor ve dakika verilir — golü kim attı?</p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid h-72 place-items-center text-ink-500">Yükleniyor…</div>
      ) : isError || !data || data.questions.length === 0 ? (
        <div className="grid h-72 place-items-center text-ink-500">Quiz yüklenemedi.</div>
      ) : (
        <Quiz date={data.date} questions={data.questions} />
      )}
    </div>
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
        // Resume at the first unanswered question.
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
        <div className="rounded-xl border border-ink-800 bg-ink-900 p-5 text-center">
          <Trophy className="mx-auto mb-1 h-7 w-7 text-amber-300" />
          <div className="text-xl font-bold text-ink-50">
            {score}/{questions.length} doğru
          </div>
          <p className="mt-0.5 text-sm text-ink-400">
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
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-400"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </div>

        {/* Review list */}
        <ul className="space-y-2">
          {questions.map((qq, i) => {
            const a = answers[qq.eventId]
            return (
              <li
                key={qq.eventId}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                  a?.correct ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : 'border-rose-500/25 bg-rose-500/[0.06]',
                )}
              >
                <span className="w-5 text-center text-xs font-bold text-ink-500">{i + 1}</span>
                <TeamLogo apiId={qq.home.apiId} size={18} />
                <span className="text-ink-400 tabular-nums">
                  {qq.homeScore}-{qq.awayScore}
                </span>
                <TeamLogo apiId={qq.away.apiId} size={18} />
                <span className="ml-auto font-semibold text-ink-100">{a?.scorer}</span>
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
      <QuestionCard
        q={q}
        answer={current}
        pending={guess.isPending}
        onPick={pick}
        onNext={() => setIdx((i) => Math.min(i + 1, questions.length - 1))}
      />
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
            className={cn('h-1.5 flex-1 rounded-full', i < answered ? 'bg-rose-500' : 'bg-ink-800')}
          />
        ))}
      </div>
      <span className="shrink-0 text-sm font-bold text-amber-300 tabular-nums">
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
  const minuteLabel =
    q.minute != null ? `${q.minute}${q.extraMinute ? `+${q.extraMinute}` : ''}'` : 'GOL'

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-800 bg-gradient-to-b from-ink-900 to-ink-950">
      {/* Match header */}
      <div className="flex items-center justify-center gap-4 border-b border-ink-800 bg-ink-900/60 px-4 py-5">
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <TeamLogo apiId={q.home.apiId} size={40} />
          <span className="line-clamp-1 text-center text-xs font-medium text-ink-300">{q.home.name}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black tabular-nums text-ink-50">
            {q.homeScore}<span className="mx-1 text-ink-600">-</span>{q.awayScore}
          </div>
          <span className="mt-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300">
            ⚽ {minuteLabel}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <TeamLogo apiId={q.away.apiId} size={40} />
          <span className="line-clamp-1 text-center text-xs font-medium text-ink-300">{q.away.name}</span>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-3 text-center text-sm text-ink-400">
          Bu golü <span className="font-semibold text-ink-100">kim</span> attı?
        </p>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isChosen = answer?.choice === opt
            const isCorrectOpt = answer && answer.scorer === opt
            let tone = 'border-ink-700 bg-ink-900 hover:border-rose-500/60 hover:bg-ink-850'
            if (answer) {
              if (isCorrectOpt) tone = 'border-emerald-500/50 bg-emerald-500/10'
              else if (isChosen) tone = 'border-rose-500/50 bg-rose-500/10'
              else tone = 'border-ink-800 bg-ink-900 opacity-60'
            }
            return (
              <button
                key={opt}
                disabled={!!answer || pending}
                onClick={() => onPick(opt)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold text-ink-100 transition',
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
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-3 text-sm font-bold text-ink-950 hover:bg-brand-400"
          >
            Sonraki <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
