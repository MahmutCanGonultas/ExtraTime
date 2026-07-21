import { useState, type ReactNode } from 'react'
import { Lock, Plus, Check, X, Users, ChevronDown } from 'lucide-react'
import type { GameFixture, MemberPrediction, Outcome } from '@/features/groups/types'
import { useFixturePredictions, useUpsertPrediction } from '@/features/groups/hooks'
import { isFinished, isLive } from '@/features/football/matchStatus'
import { FormBadges } from '@/features/football/FormBadges'
import { GoalList } from '@/features/football/GoalList'
import { TeamLogo } from '@/components/TeamLogo'
import { MemberAvatar } from '@/components/MemberAvatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useCountdown, formatCountdown } from '@/lib/useCountdown'
import { formatDateTime, liveMinuteLabel, outcomeLabel } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

function pointsTone(points: number): 'win' | 'warning' | 'loss' {
  if (points >= 3) return 'win'
  if (points > 0) return 'warning'
  return 'loss'
}

function deriveOutcome(home: string, away: string): Outcome | null {
  if (home === '' || away === '') return null
  const h = Number(home)
  const a = Number(away)
  if (h > a) return 'HOME'
  if (h < a) return 'AWAY'
  return 'DRAW'
}

// Each pick gets its own colour so the card reads in colour, not grey: home win
// emerald, draw amber, away win sky.
const OUTCOME_ACTIVE: Record<Outcome, string> = {
  HOME: 'border-emerald-300 bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 ring-emerald-300/60 shadow-emerald-950/50',
  DRAW: 'border-amber-300 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 ring-amber-200/70 shadow-amber-950/40',
  AWAY: 'border-sky-300 bg-gradient-to-b from-sky-400 to-sky-600 text-ink-950 ring-sky-300/60 shadow-sky-950/50',
}
const OUTCOME_TEXT: Record<Outcome, string> = {
  HOME: 'text-emerald-300',
  DRAW: 'text-amber-300',
  AWAY: 'text-sky-300',
}

export function GamePredictCard({
  fixture,
  groupId,
  gameId,
  onRemove,
}: {
  fixture: GameFixture
  groupId: number
  gameId: number
  onRemove?: () => void
}) {
  const countdown = useCountdown(fixture.kickoffAt)
  const upsert = useUpsertPrediction(groupId, gameId)
  const [outcome, setOutcome] = useState<Outcome | null>(fixture.myOutcome)
  const [home, setHome] = useState(fixture.myHome != null ? String(fixture.myHome) : '')
  const [away, setAway] = useState(fixture.myAway != null ? String(fixture.myAway) : '')
  const [showScore, setShowScore] = useState(fixture.myHome != null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const live = isLive(fixture.status)
  const finished = isFinished(fixture.status)
  const showResult = live || finished
  const locked = !fixture.open
  // A left stripe plus a faint matching wash tell the state apart at a glance
  // (green win / amber part / red miss / red live) without a loud full-colour card.
  const statusStripe =
    finished && fixture.myPoints != null
      ? fixture.myPoints >= 3
        ? 'border-l-[3px] border-l-emerald-500'
        : fixture.myPoints > 0
          ? 'border-l-[3px] border-l-amber-500'
          : 'border-l-[3px] border-l-rose-500'
      : live
        ? 'border-l-[3px] border-l-rose-500'
        : !locked
          ? 'border-l-[3px] border-l-brand-500'
          : ''
  const statusWash =
    finished && fixture.myPoints != null
      ? fixture.myPoints >= 3
        ? 'bg-emerald-500/[0.05]'
        : fixture.myPoints > 0
          ? 'bg-amber-500/[0.05]'
          : 'bg-rose-500/[0.05]'
      : live
        ? 'bg-rose-500/[0.05]'
        : ''
  // Predictions are final: once submitted, a member can no longer change it.
  const predicted = fixture.myOutcome != null

  // Picking an outcome clears an inconsistent score; typing a score sets the outcome.
  function pickOutcome(o: Outcome) {
    setOutcome(o)
    if (deriveOutcome(home, away) !== o) {
      setHome('')
      setAway('')
    }
  }
  function editScore(next: { h?: string; a?: string }) {
    const h = next.h ?? home
    const a = next.a ?? away
    setHome(h)
    setAway(a)
    const d = deriveOutcome(h, a)
    if (d) setOutcome(d)
  }

  const hasScore = home !== '' && away !== ''

  async function save() {
    if (!outcome) return
    setError(null)
    try {
      await upsert.mutateAsync({
        fixtureId: fixture.fixtureId,
        outcome,
        predictedHome: hasScore ? Number(home) : null,
        predictedAway: hasScore ? Number(away) : null,
      })
      setConfirming(false)
      // The refetch flips this card into its read-only "predicted" state.
    } catch (err) {
      setConfirming(false)
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi')
    }
  }

  return (
    <Card className={cn('transition duration-200', statusStripe, statusWash)}>
      <CardBody className="space-y-3">
        {/* header */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 truncate text-ink-400">
            <TeamLogo apiId={fixture.leagueApiId} kind="league" size={15} />
            <span className="truncate">{fixture.leagueName}</span>
          </span>
          <span className="flex items-center gap-1.5">
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-loss/15 px-2 py-0.5 text-[11px] font-bold text-loss">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-loss" />
                </span>
                CANLI {liveMinuteLabel(fixture.status, fixture.elapsed)}
              </span>
            ) : finished ? (
              <Badge tone="neutral">Bitti</Badge>
            ) : locked ? (
              <Badge tone="neutral">
                <Lock className="mr-1 h-3 w-3" /> Başladı
              </Badge>
            ) : (
              <Badge tone="brand">{formatCountdown(countdown)}</Badge>
            )}
            {onRemove && !locked && (
              <button
                onClick={onRemove}
                title="Oyundan çıkar"
                className="-m-1 rounded p-2.5 text-ink-500 transition hover:text-loss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </div>

        {/* teams */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamLogo apiId={fixture.homeApiId} size={26} />
            <span className="truncate text-sm font-bold text-ink-100">{fixture.homeName}</span>
          </div>
          {showResult ? (
            <span
              className={cn(
                'score-num shrink-0 font-bold tabular-nums',
                live ? 'text-xl text-amber-300' : 'text-lg text-ink-100',
              )}
            >
              {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
            </span>
          ) : (
            <span className="shrink-0 text-xs text-ink-500">{formatDateTime(fixture.kickoffAt)}</span>
          )}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right text-sm font-bold text-ink-100">
              {fixture.awayName}
            </span>
            <TeamLogo apiId={fixture.awayApiId} size={26} />
          </div>
        </div>

        {/* Goals (scorer + assist) — shown live as they happen and after full time. */}
        {showResult && fixture.goals.length > 0 && (
          <div className="rounded-lg bg-ink-850/60 px-3 py-1.5">
            <GoalList goals={fixture.goals} />
          </div>
        )}

        {locked ? (
          /* locked — my pick + everyone else's, revealed now that it's kicked off */
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-ink-850 px-3 py-2 text-sm">
              {fixture.myOutcome ? (
                <span className="text-ink-200">
                  Tahminin:{' '}
                  <span className={cn('font-bold', OUTCOME_TEXT[fixture.myOutcome])}>
                    {outcomeLabel(fixture.myOutcome, fixture.homeName, fixture.awayName)}
                  </span>
                  {fixture.myHome != null && (
                    <span className="text-ink-400">
                      {' '}
                      · {fixture.myHome}-{fixture.myAway}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-ink-500">Tahmin girmedin</span>
              )}
              {fixture.myPoints != null && (
                <Badge tone={pointsTone(fixture.myPoints)}>{fixture.myPoints} puan</Badge>
              )}
            </div>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/[0.07] py-2 text-xs font-semibold text-sky-300 transition hover:border-sky-400/50 hover:bg-sky-500/15"
            >
              <Users className="h-3.5 w-3.5" /> Herkesin tahmini
              <ChevronDown className={`h-3.5 w-3.5 transition ${showAll ? 'rotate-180' : ''}`} />
            </button>
            {showAll && (
              <EveryonesPredictions
                groupId={groupId}
                fixtureId={fixture.fixtureId}
                homeName={fixture.homeName}
                awayName={fixture.awayName}
              />
            )}
          </div>
        ) : predicted ? (
          /* submitted — final, cannot be changed; joker can still be set */
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-brand-500/20 bg-brand-500/[0.06] px-3 py-2 text-sm">
              <span className="text-ink-200">
                Tahminin:{' '}
                <span className={cn('font-bold', OUTCOME_TEXT[fixture.myOutcome!])}>
                  {outcomeLabel(fixture.myOutcome!, fixture.homeName, fixture.awayName)}
                </span>
                {fixture.myHome != null && (
                  <span className="text-ink-400">
                    {' '}
                    · {fixture.myHome}-{fixture.myAway}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-ink-500">
                <Lock className="h-3 w-3" /> değiştirilemez
              </span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-[11px] text-ink-500">{fixture.predictionCount} tahmin</span>
            </div>
          </div>
        ) : (
          /* editable — form + pick + optional score + joker + confirm-then-save */
          <>
            {(fixture.homeForm || fixture.awayForm) && (
              <div className="flex items-center justify-between text-[11px] text-ink-500">
                <FormBadges form={fixture.homeForm} />
                <span className="uppercase tracking-wide">son 5</span>
                <FormBadges form={fixture.awayForm} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              <OutcomeButton
                active={outcome === 'HOME'}
                activeClass={OUTCOME_ACTIVE.HOME}
                onClick={() => pickOutcome('HOME')}
              >
                <TeamLogo apiId={fixture.homeApiId} size={20} />
                <span>Ev</span>
              </OutcomeButton>
              <OutcomeButton
                active={outcome === 'DRAW'}
                activeClass={OUTCOME_ACTIVE.DRAW}
                onClick={() => pickOutcome('DRAW')}
              >
                <span className="text-base font-black">X</span>
                <span>Beraberlik</span>
              </OutcomeButton>
              <OutcomeButton
                active={outcome === 'AWAY'}
                activeClass={OUTCOME_ACTIVE.AWAY}
                onClick={() => pickOutcome('AWAY')}
              >
                <TeamLogo apiId={fixture.awayApiId} size={20} />
                <span>Deplasman</span>
              </OutcomeButton>
            </div>

            {showScore ? (
              <div className="flex items-center justify-center gap-2">
                <ScoreBox value={home} onChange={(v) => editScore({ h: v })} />
                <span className="text-ink-500">-</span>
                <ScoreBox value={away} onChange={(v) => editScore({ a: v })} />
                <span className="ml-1 text-xs text-ink-500">tam skor 5 · kaçarsa −1</span>
              </div>
            ) : (
              <button
                onClick={() => setShowScore(true)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-700 py-1.5 text-xs text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
              >
                <Plus className="h-3.5 w-3.5" /> Skor tahmini ekle (riskli: 5 puan / −1)
              </button>
            )}

            {confirming ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                <span className="text-xs text-amber-200">Emin misin? Tahmin sonra değiştirilemez.</span>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                    Vazgeç
                  </Button>
                  <Button size="sm" onClick={save} disabled={upsert.isPending}>
                    <Check className="h-4 w-4" /> Evet, kaydet
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2">
                {error && <span className="text-xs text-loss">{error}</span>}
                <Button size="sm" onClick={() => setConfirming(true)} disabled={outcome === null}>
                  Kaydet
                </Button>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

// Everyone's picks for one fixture — revealed only after kickoff (the server hides
// them while the match is open so nobody can copy).
function EveryonesPredictions({
  groupId,
  fixtureId,
  homeName,
  awayName,
}: {
  groupId: number
  fixtureId: number
  homeName: string
  awayName: string
}) {
  const { data, isLoading } = useFixturePredictions(groupId, fixtureId)
  if (isLoading)
    return <div className="py-2 text-center text-xs text-ink-500">Yükleniyor…</div>
  if (!data) return null
  if (!data.locked)
    return (
      <div className="rounded-lg bg-ink-850 px-3 py-2 text-center text-xs text-ink-500">
        Tahminler maç başlayınca açılır.
      </div>
    )
  if (data.predictions.length === 0)
    return (
      <div className="rounded-lg bg-ink-850 px-3 py-2 text-center text-xs text-ink-500">
        Kimse tahmin girmemiş.
      </div>
    )
  return (
    <ul className="divide-y divide-ink-850 overflow-hidden rounded-lg border border-ink-800">
      {data.predictions.map((p) => (
        <MemberRow key={p.userId} p={p} homeName={homeName} awayName={awayName} />
      ))}
    </ul>
  )
}

function MemberRow({
  p,
  homeName,
  awayName,
}: {
  p: MemberPrediction
  homeName: string
  awayName: string
}) {
  const pick =
    p.predictedHome != null
      ? `${p.predictedHome}-${p.predictedAway}`
      : outcomeLabel(p.predictedOutcome, homeName, awayName)
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <MemberAvatar name={p.displayName} avatar={p.avatar} size={24} />
        <span className="min-w-0 truncate text-ink-200">{p.displayName}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={cn('font-bold', OUTCOME_TEXT[p.predictedOutcome])}>{pick}</span>
        {p.pointsAwarded != null && <Badge tone={pointsTone(p.pointsAwarded)}>{p.pointsAwarded}</Badge>}
      </span>
    </li>
  )
}

function OutcomeButton({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean
  activeClass: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-semibold transition',
        active
          ? `scale-[1.03] shadow-md ring-1 ${activeClass}`
          : 'border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100',
      )}
    >
      {children}
    </button>
  )
}

function ScoreBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
      className="h-10 w-11 rounded-lg border border-ink-700 bg-ink-850 text-center text-lg font-bold text-ink-100 focus:border-brand-500 focus:outline-none"
    />
  )
}
