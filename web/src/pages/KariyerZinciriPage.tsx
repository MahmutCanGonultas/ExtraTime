import { useEffect, useMemo, useState } from 'react'
import { Route as RouteIcon, Check, X, Share2, Trophy, ChevronRight, Link2 } from 'lucide-react'
import { TeamLogo } from '@/components/TeamLogo'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { useCareerQuiz, useCareerGuess } from '@/features/games/hooks'
import { ArenaShell, GAME_THEMES, GameHero, GlassPanel } from '@/features/games/ui'
import type { CareerQuestion } from '@/features/games/types'
import { legendPairQuiz, pairSharedSet, todayUtc, type LegendPairQuestion } from '@/features/games/legendGame'
import { countryFlag } from '@/features/games/legendFlags'

const THEME = GAME_THEMES.kariyer

type Mode = 'guncel' | 'efsane'

type Answer = { chosen: number; correct: boolean; shared: number[] }

const qKey = (q: CareerQuestion) => `${q.playerA.apiId}-${q.playerB.apiId}`

export default function KariyerZinciriPage() {
  const [mode, setMode] = useState<Mode>('guncel')
  return (
    <ArenaShell theme={THEME} maxW="max-w-lg">
      <GameHero
        theme={THEME}
        icon={RouteIcon}
        title="Kariyer Zinciri"
        subtitle="İki oyuncunun birlikte oynadığı ortak kulübü bul"
      />
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {(['guncel', 'efsane'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg py-2 text-sm font-bold transition',
              mode === m ? 'bg-gradient-to-r from-violet-400 to-fuchsia-500 text-white shadow' : 'text-white/60 hover:text-white',
            )}
          >
            {m === 'guncel' ? 'Güncel' : 'Efsaneler'}
          </button>
        ))}
      </div>
      {mode === 'guncel' ? <GuncelMode /> : <EfsaneMode />}
    </ArenaShell>
  )
}

function GuncelMode() {
  const { data, isLoading, isError } = useCareerQuiz()
  if (isLoading) return <div className="grid h-72 place-items-center text-white/50">Yükleniyor…</div>
  if (isError || !data || data.questions.length === 0)
    return <div className="grid h-72 place-items-center text-white/50">Quiz yüklenemedi.</div>
  return <Quiz date={data.date} questions={data.questions} />
}

function Quiz({ date, questions }: { date: string; questions: CareerQuestion[] }) {
  const storageKey = `kariyer-zinciri:${date}`
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [idx, setIdx] = useState(0)
  const guess = useCareerGuess()

  useEffect(() => {
    const raw = safeGetItem(storageKey)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Record<string, Answer>
        setAnswers(saved)
        const firstUnanswered = questions.findIndex((q) => !saved[qKey(q)])
        setIdx(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered)
      } catch {
        /* ignore */
      }
    }
  }, [storageKey, questions])

  const q = questions[idx]
  const current = answers[qKey(q)]
  const answeredCount = Object.keys(answers).length
  const score = Object.values(answers).filter((a) => a.correct).length
  const allDone = answeredCount >= questions.length

  async function pick(teamApiId: number) {
    if (current || guess.isPending) return
    const res = await guess.mutateAsync({
      playerAApiId: q.playerA.apiId,
      playerBApiId: q.playerB.apiId,
      teamApiId,
    })
    const next = { ...answers, [qKey(q)]: { chosen: teamApiId, correct: res.correct, shared: res.sharedTeamApiIds } }
    setAnswers(next)
    safeSetItem(storageKey, JSON.stringify(next))
  }

  const shareText = useMemo(() => {
    if (!allDone) return ''
    let out = `Kariyer Zinciri ${date}\n`
    out += questions.map((qq) => (answers[qKey(qq)]?.correct ? '🟣' : '⚫')).join('')
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
              ? 'Kusursuz hafıza! 🧠'
              : score >= questions.length * 0.7
                ? 'Çok iyi!'
                : score >= questions.length * 0.4
                  ? 'Fena değil.'
                  : 'Yarın tekrar dene.'}
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(shareText).catch(() => {})}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </GlassPanel>

        <ul className="space-y-2">
          {questions.map((qq, i) => {
            const a = answers[qKey(qq)]
            const correctOpt = qq.options.find((o) => a?.shared.includes(o.teamApiId))
            return (
              <li
                key={qKey(qq)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur-sm',
                  a?.correct ? 'border-violet-400/30 bg-violet-500/[0.08]' : 'border-rose-400/30 bg-rose-500/[0.08]',
                )}
              >
                <span className="w-5 text-center text-xs font-bold text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-white/80">
                  {qq.playerA.name.split(' ').slice(-1)} × {qq.playerB.name.split(' ').slice(-1)}
                </span>
                {correctOpt && <TeamLogo apiId={correctOpt.teamApiId} size={18} />}
                <span className="max-w-[7rem] truncate font-semibold text-white">{correctOpt?.teamName}</span>
                {a?.correct ? (
                  <Check className="h-4 w-4 shrink-0 text-violet-300" />
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
              i < answered ? 'bg-gradient-to-r from-violet-400 to-fuchsia-500' : 'bg-white/10',
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

function PlayerFace({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-16 w-16 rounded-full bg-white/10 object-cover ring-2 ring-white/20" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-white/10 ring-2 ring-white/20" />
      )}
      <span className="line-clamp-2 text-center text-xs font-semibold text-white/80">{name}</span>
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
  q: CareerQuestion
  answer?: Answer
  pending: boolean
  onPick: (teamApiId: number) => void
  onNext: () => void
}) {
  return (
    <GlassPanel glow={THEME.glow1} className="overflow-hidden">
      {/* The two players linked */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-5">
        <PlayerFace name={q.playerA.name} photoUrl={q.playerA.photoUrl} />
        <div className="flex flex-col items-center gap-1 text-violet-300">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/20 ring-1 ring-violet-400/30">
            <Link2 className="h-4 w-4" />
          </div>
        </div>
        <PlayerFace name={q.playerB.name} photoUrl={q.playerB.photoUrl} />
      </div>

      <div className="p-4">
        <p className="mb-3 text-center text-sm text-white/60">
          Bu ikili hangi kulüpte <span className="font-semibold text-white">birlikte</span> oynadı?
        </p>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isChosen = answer?.chosen === opt.teamApiId
            const isCorrectOpt = answer?.shared.includes(opt.teamApiId)
            let tone = 'border-white/10 bg-white/[0.03] hover:border-violet-400/60 hover:bg-white/[0.07]'
            if (answer) {
              if (isCorrectOpt) tone = 'border-violet-400/50 bg-violet-500/15'
              else if (isChosen) tone = 'border-rose-400/50 bg-rose-500/15'
              else tone = 'border-white/5 bg-white/[0.02] opacity-50'
            }
            return (
              <button
                key={opt.teamApiId}
                disabled={!!answer || pending}
                onClick={() => onPick(opt.teamApiId)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold text-white transition',
                  tone,
                )}
              >
                <TeamLogo apiId={opt.teamApiId} size={24} />
                <span className="flex-1">{opt.teamName}</span>
                {answer && isCorrectOpt && <Check className="h-5 w-5 text-violet-300" />}
                {answer && isChosen && !isCorrectOpt && <X className="h-5 w-5 text-rose-400" />}
              </button>
            )
          })}
        </div>

        {answer && (
          <button
            onClick={onNext}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            Sonraki <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </GlassPanel>
  )
}

// ── Efsaneler mode: two legends who shared a club (fully client-side) ─────────
type LegendAnswer = { chosen: string; correct: boolean }
const lKey = (q: LegendPairQuestion) => `${q.a.name}__${q.b.name}`

function EfsaneMode() {
  const date = todayUtc()
  const questions = useMemo(() => legendPairQuiz(date, 8), [date])
  if (questions.length === 0)
    return <div className="grid h-72 place-items-center text-white/50">Yüklenemedi.</div>
  return <LegendQuiz date={date} questions={questions} />
}

function LegendQuiz({ date, questions }: { date: string; questions: LegendPairQuestion[] }) {
  const storageKey = `kariyer-zinciri-efsane:${date}`
  const [answers, setAnswers] = useState<Record<string, LegendAnswer>>({})
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const raw = safeGetItem(storageKey)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Record<string, LegendAnswer>
        setAnswers(saved)
        const first = questions.findIndex((q) => !saved[lKey(q)])
        setIdx(first === -1 ? questions.length - 1 : first)
      } catch {
        /* ignore */
      }
    }
  }, [storageKey, questions])

  const q = questions[idx]
  const current = answers[lKey(q)]
  const answeredCount = Object.keys(answers).length
  const score = Object.values(answers).filter((a) => a.correct).length
  const allDone = answeredCount >= questions.length

  function pick(club: string) {
    if (current) return
    const correct = pairSharedSet(q.a, q.b).has(club.toLowerCase())
    const next = { ...answers, [lKey(q)]: { chosen: club, correct } }
    setAnswers(next)
    safeSetItem(storageKey, JSON.stringify(next))
  }

  const shareText = useMemo(() => {
    if (!allDone) return ''
    let out = `Kariyer Zinciri (Efsaneler) ${date}\n`
    out += questions.map((qq) => (answers[lKey(qq)]?.correct ? '🟣' : '⚫')).join('')
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
          <button
            onClick={() => navigator.clipboard?.writeText(shareText).catch(() => {})}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            <Share2 className="h-4 w-4" /> Sonucu kopyala
          </button>
        </GlassPanel>
        <ul className="space-y-2">
          {questions.map((qq, i) => {
            const a = answers[lKey(qq)]
            const shared = pairSharedSet(qq.a, qq.b)
            const correctOpt = qq.options.find((o) => shared.has(o.toLowerCase()))
            return (
              <li
                key={lKey(qq)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur-sm',
                  a?.correct ? 'border-violet-400/30 bg-violet-500/[0.08]' : 'border-rose-400/30 bg-rose-500/[0.08]',
                )}
              >
                <span className="w-5 text-center text-xs font-bold text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-white/80">
                  {qq.a.name.split(' ').slice(-1)} × {qq.b.name.split(' ').slice(-1)}
                </span>
                <span className="max-w-[8rem] truncate font-semibold text-white">{correctOpt}</span>
                {a?.correct ? <Check className="h-4 w-4 shrink-0 text-violet-300" /> : <X className="h-4 w-4 shrink-0 text-rose-400" />}
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
      <LegendQuestionCard q={q} answer={current} onPick={pick} onNext={() => setIdx((i) => Math.min(i + 1, questions.length - 1))} />
    </div>
  )
}

function LegendFace({ name, country }: { name: string; country: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-3xl ring-2 ring-white/20">
        {countryFlag(country)}
      </div>
      <span className="line-clamp-2 text-center text-xs font-semibold text-white/80">{name}</span>
    </div>
  )
}

function LegendQuestionCard({
  q,
  answer,
  onPick,
  onNext,
}: {
  q: LegendPairQuestion
  answer?: LegendAnswer
  onPick: (club: string) => void
  onNext: () => void
}) {
  const shared = answer ? pairSharedSet(q.a, q.b) : null
  return (
    <GlassPanel glow={THEME.glow1} className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-5">
        <LegendFace name={q.a.name} country={q.a.country} />
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30">
          <Link2 className="h-4 w-4" />
        </div>
        <LegendFace name={q.b.name} country={q.b.country} />
      </div>
      <div className="p-4">
        <p className="mb-3 text-center text-sm text-white/60">
          Bu ikili hangi kulüpte <span className="font-semibold text-white">birlikte</span> oynadı?
        </p>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isChosen = answer?.chosen === opt
            const isCorrectOpt = shared?.has(opt.toLowerCase())
            let tone = 'border-white/10 bg-white/[0.03] hover:border-violet-400/60 hover:bg-white/[0.07]'
            if (answer) {
              if (isCorrectOpt) tone = 'border-violet-400/50 bg-violet-500/15'
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
                {answer && isCorrectOpt && <Check className="h-5 w-5 text-violet-300" />}
                {answer && isChosen && !isCorrectOpt && <X className="h-5 w-5 text-rose-400" />}
              </button>
            )
          })}
        </div>
        {answer && (
          <button
            onClick={onNext}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            Sonraki <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </GlassPanel>
  )
}
