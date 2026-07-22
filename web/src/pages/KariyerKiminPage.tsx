import { useEffect, useMemo, useState } from 'react'
import { Crown, Check, X, Share2, Trophy, ChevronRight, Eye } from 'lucide-react'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { ArenaShell, GAME_THEMES, GameHero, GlassPanel } from '@/features/games/ui'
import { legendWhoQuiz, todayUtc, type LegendWhoQuestion } from '@/features/games/legendGame'
import { countryFlag } from '@/features/games/legendFlags'

const THEME = GAME_THEMES.legends
const START_SHOWN = 2
function pointsFor(shown: number): number {
  return Math.max(3, 15 - (shown - START_SHOWN) * 2)
}

type Answer = { pick: string; correct: boolean; points: number }

export default function KariyerKiminPage() {
  const date = todayUtc()
  const questions = useMemo(() => legendWhoQuiz(date, 10), [date])

  return (
    <ArenaShell theme={THEME} maxW="max-w-lg">
      <GameHero theme={THEME} icon={Crown} title="Kariyer Kimin?" subtitle="Kulüp kariyerine bak, efsaneyi bil" />
      {questions.length === 0 ? (
        <div className="grid h-72 place-items-center text-white/50">Yüklenemedi.</div>
      ) : (
        <Quiz date={date} questions={questions} />
      )}
    </ArenaShell>
  )
}

function Quiz({ date, questions }: { date: string; questions: LegendWhoQuestion[] }) {
  const storageKey = `kariyer-kimin:${date}`
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(START_SHOWN)

  useEffect(() => {
    const raw = safeGetItem(storageKey)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Record<string, Answer>
        setAnswers(saved)
        const first = questions.findIndex((q) => !saved[q.legend.name])
        setIdx(first === -1 ? questions.length - 1 : first)
      } catch {
        /* ignore */
      }
    }
  }, [storageKey, questions])

  // Reset the reveal count when moving to a fresh (unanswered) question.
  useEffect(() => {
    setShown(START_SHOWN)
  }, [idx])

  const q = questions[idx]
  const current = answers[q.legend.name]
  const answeredCount = Object.keys(answers).length
  const score = Object.values(answers).reduce((s, a) => s + a.points, 0)
  const correctCount = Object.values(answers).filter((a) => a.correct).length
  const allDone = answeredCount >= questions.length

  function pick(name: string) {
    if (current) return
    const correct = name === q.legend.name
    const next = { ...answers, [q.legend.name]: { pick: name, correct, points: correct ? pointsFor(shown) : 0 } }
    setAnswers(next)
    safeSetItem(storageKey, JSON.stringify(next))
  }

  const shareText = useMemo(() => {
    if (!allDone) return ''
    let out = `Kariyer Kimin? ${date}\n`
    out += questions.map((qq) => (answers[qq.legend.name]?.correct ? '🟡' : '⚫')).join('')
    out += `\n${correctCount}/${questions.length} · ${score} puan`
    return out
  }, [allDone, answers, questions, date, correctCount, score])

  if (allDone) {
    return (
      <div className="space-y-4">
        <ScoreBar answered={answeredCount} total={questions.length} score={score} />
        <GlassPanel glow={THEME.glow2} className="p-5 text-center">
          <Trophy className="mx-auto mb-1 h-8 w-8 text-amber-300" />
          <div className="font-display text-3xl font-bold uppercase tracking-wide text-white">
            {correctCount}/{questions.length} · {score} puan
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(shareText).catch(() => {})}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg hover:brightness-110"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </GlassPanel>

        <ul className="space-y-2">
          {questions.map((qq, i) => {
            const a = answers[qq.legend.name]
            return (
              <li
                key={qq.legend.name}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur-sm',
                  a?.correct ? 'border-amber-400/30 bg-amber-500/[0.08]' : 'border-rose-400/30 bg-rose-500/[0.08]',
                )}
              >
                <span className="w-5 text-center text-xs font-bold text-white/40">{i + 1}</span>
                <span className="text-lg">{countryFlag(qq.legend.country)}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{qq.legend.name}</span>
                {a?.correct ? <Check className="h-4 w-4 shrink-0 text-amber-300" /> : <X className="h-4 w-4 shrink-0 text-rose-400" />}
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
        shown={shown}
        onReveal={() => setShown((s) => Math.min(s + 1, q.legend.clubs.length))}
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
          <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < answered ? 'bg-gradient-to-r from-amber-300 to-yellow-500' : 'bg-white/10')} />
        ))}
      </div>
      <span className="shrink-0 font-display text-lg font-bold tabular-nums text-amber-300">{score}</span>
    </div>
  )
}

function QuestionCard({
  q,
  answer,
  shown,
  onReveal,
  onPick,
  onNext,
}: {
  q: LegendWhoQuestion
  answer?: Answer
  shown: number
  onReveal: () => void
  onPick: (name: string) => void
  onNext: () => void
}) {
  const total = q.legend.clubs.length
  const revealAll = !!answer
  const visible = revealAll ? total : shown

  return (
    <GlassPanel glow={THEME.glow1} className="overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Kulüp kariyeri</span>
          {answer && (
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-200">
              {countryFlag(q.legend.country)} {q.legend.name}
            </span>
          )}
        </div>
        <ol className="space-y-1.5">
          {q.legend.clubs.slice(0, visible).map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-200">
                {i + 1}
              </span>
              <span className={cn('font-medium', c.loan ? 'text-white/50 italic' : 'text-white')}>
                {c.name}
                {c.loan && <span className="ml-1 text-[10px] text-white/40">(kiralık)</span>}
              </span>
            </li>
          ))}
          {visible < total && (
            <li className="text-xs text-white/35">+{total - visible} kulüp gizli…</li>
          )}
        </ol>
        {!answer && visible < total && (
          <button
            onClick={onReveal}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
          >
            <Eye className="h-3.5 w-3.5" /> Kulüp göster (puan azalır)
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="mb-3 text-center text-sm text-white/60">Bu kariyer kimin?</p>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isChosen = answer?.pick === opt
            const isCorrectOpt = answer && opt === q.legend.name
            let tone = 'border-white/10 bg-white/[0.03] hover:border-amber-400/60 hover:bg-white/[0.07]'
            if (answer) {
              if (isCorrectOpt) tone = 'border-amber-400/50 bg-amber-500/15'
              else if (isChosen) tone = 'border-rose-400/50 bg-rose-500/15'
              else tone = 'border-white/5 bg-white/[0.02] opacity-50'
            }
            return (
              <button
                key={opt}
                disabled={!!answer}
                onClick={() => onPick(opt)}
                className={cn('flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold text-white transition', tone)}
              >
                <span>{opt}</span>
                {answer && isCorrectOpt && <Check className="h-5 w-5 text-amber-300" />}
                {answer && isChosen && !isCorrectOpt && <X className="h-5 w-5 text-rose-400" />}
              </button>
            )
          })}
        </div>

        {answer && (
          <button
            onClick={onNext}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3 text-sm font-bold text-amber-950 shadow-lg hover:brightness-110"
          >
            Sonraki <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </GlassPanel>
  )
}
