import { useEffect, useMemo, useState } from 'react'
import { Crown, Check, X, Share2, Trophy, ChevronRight, Eye } from 'lucide-react'
import { cn } from '@/lib/cn'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import { ArenaShell, GAME_THEMES, GameHero, GlassPanel } from '@/features/games/ui'
import { legendWhoQuiz, todayUtc } from '@/features/games/legendGame'
import { countryFlag } from '@/features/games/legendFlags'
import { LEGEND_CLUB_LOGO } from '@/features/games/legendClubLogos'
import { useCareerWhoQuiz } from '@/features/games/hooks'
import { TeamLogo } from '@/components/TeamLogo'

const THEME = GAME_THEMES.legends
const START_SHOWN = 2
function pointsFor(shown: number): number {
  return Math.max(3, 15 - (shown - START_SHOWN) * 2)
}

type Mode = 'guncel' | 'efsane'
type WhoClub = { name: string; teamApiId: number | null; loan?: boolean }
type WhoQuestion = {
  key: string
  correct: string
  photoUrl: string | null
  country?: string
  clubs: WhoClub[]
  options: string[]
}
type Answer = { pick: string; correct: boolean; points: number }

export default function KariyerKiminPage() {
  const [mode, setMode] = useState<Mode>('guncel')
  return (
    <ArenaShell theme={THEME} maxW="max-w-lg">
      <GameHero theme={THEME} icon={Crown} title="Kariyer Kimin?" subtitle="Kulüp kariyerine bak, oyuncuyu bil" />
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {(['guncel', 'efsane'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg py-2 text-sm font-bold transition',
              mode === m ? 'bg-gradient-to-r from-amber-300 to-yellow-500 text-amber-950 shadow' : 'text-white/60 hover:text-white',
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

function EfsaneMode() {
  const date = todayUtc()
  const questions = useMemo<WhoQuestion[]>(
    () =>
      legendWhoQuiz(date, 10).map((q) => ({
        key: q.legend.name,
        correct: q.legend.name,
        photoUrl: null,
        country: q.legend.country,
        clubs: q.legend.clubs.map((c) => ({ name: c.name, teamApiId: LEGEND_CLUB_LOGO[c.name] ?? null, loan: c.loan })),
        options: q.options,
      })),
    [date],
  )
  if (questions.length === 0) return <div className="grid h-72 place-items-center text-white/50">Yüklenemedi.</div>
  return <Quiz storagePrefix="kariyer-kimin" date={date} questions={questions} />
}

function GuncelMode() {
  const { data, isLoading, isError } = useCareerWhoQuiz()
  const questions = useMemo<WhoQuestion[]>(
    () =>
      (data?.questions ?? []).map((q) => ({
        key: String(q.playerApiId),
        correct: q.name,
        photoUrl: q.photoUrl,
        clubs: q.clubs.map((c) => ({ name: c.teamName, teamApiId: c.teamApiId })),
        options: q.options,
      })),
    [data],
  )
  if (isLoading) return <div className="grid h-72 place-items-center text-white/50">Yükleniyor…</div>
  if (isError || questions.length === 0)
    return <div className="grid h-72 place-items-center text-white/50">Yüklenemedi.</div>
  return <Quiz storagePrefix="kariyer-kimin-guncel" date={data!.date} questions={questions} />
}

function Quiz({ storagePrefix, date, questions }: { storagePrefix: string; date: string; questions: WhoQuestion[] }) {
  const storageKey = `${storagePrefix}:${date}`
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(START_SHOWN)

  useEffect(() => {
    const raw = safeGetItem(storageKey)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Record<string, Answer>
        setAnswers(saved)
        const first = questions.findIndex((q) => !saved[q.key])
        setIdx(first === -1 ? questions.length - 1 : first)
      } catch {
        /* ignore */
      }
    }
  }, [storageKey, questions])

  useEffect(() => {
    setShown(START_SHOWN)
  }, [idx])

  const q = questions[idx]
  const current = answers[q.key]
  const answeredCount = Object.keys(answers).length
  const score = Object.values(answers).reduce((s, a) => s + a.points, 0)
  const correctCount = Object.values(answers).filter((a) => a.correct).length
  const allDone = answeredCount >= questions.length

  function pick(name: string) {
    if (current) return
    const correct = name === q.correct
    const next = { ...answers, [q.key]: { pick: name, correct, points: correct ? pointsFor(shown) : 0 } }
    setAnswers(next)
    safeSetItem(storageKey, JSON.stringify(next))
  }

  const shareText = useMemo(() => {
    if (!allDone) return ''
    let out = `Kariyer Kimin? ${date}\n`
    out += questions.map((qq) => (answers[qq.key]?.correct ? '🟡' : '⚫')).join('')
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
            const a = answers[qq.key]
            return (
              <li
                key={qq.key}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur-sm',
                  a?.correct ? 'border-amber-400/30 bg-amber-500/[0.08]' : 'border-rose-400/30 bg-rose-500/[0.08]',
                )}
              >
                <span className="w-5 text-center text-xs font-bold text-white/40">{i + 1}</span>
                {qq.country && <span className="text-lg">{countryFlag(qq.country)}</span>}
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{qq.correct}</span>
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
        onReveal={() => setShown((s) => Math.min(s + 1, q.clubs.length))}
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
  q: WhoQuestion
  answer?: Answer
  shown: number
  onReveal: () => void
  onPick: (name: string) => void
  onNext: () => void
}) {
  const total = q.clubs.length
  const visible = answer ? total : shown

  return (
    <GlassPanel glow={THEME.glow1} className="overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Kulüp kariyeri</span>
          {answer && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-200">
              {q.photoUrl ? (
                <img src={q.photoUrl} alt="" className="h-6 w-6 rounded-full bg-white/10 object-cover ring-1 ring-white/30" />
              ) : q.country ? (
                <span>{countryFlag(q.country)}</span>
              ) : null}
              {q.correct}
            </span>
          )}
        </div>
        <ol className="space-y-1.5">
          {q.clubs.slice(0, visible).map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-200">
                {i + 1}
              </span>
              {c.teamApiId ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/90">
                  <TeamLogo apiId={c.teamApiId} size={18} />
                </span>
              ) : (
                <span className="h-6 w-6 shrink-0" />
              )}
              <span className={cn('font-medium', c.loan ? 'text-white/50 italic' : 'text-white')}>
                {c.name}
                {c.loan && <span className="ml-1 text-[10px] text-white/40">(kiralık)</span>}
              </span>
            </li>
          ))}
          {visible < total && <li className="text-xs text-white/35">+{total - visible} kulüp gizli…</li>}
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
            const isCorrectOpt = answer && opt === q.correct
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
