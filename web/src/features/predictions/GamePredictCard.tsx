import { useState, type ReactNode } from 'react'
import { Lock, Plus, Check, X, Users, ChevronDown } from 'lucide-react'
import type { GameFixture, MemberPrediction, Outcome } from '@/features/groups/types'
import { useFixturePredictions, useUpsertPrediction } from '@/features/groups/hooks'
import { isFinished, isLive } from '@/features/football/matchStatus'
import { FormBadges } from '@/features/football/FormBadges'
import { TeamLogo } from '@/components/TeamLogo'
import { MemberAvatar } from '@/components/MemberAvatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useCountdown, formatCountdown } from '@/lib/useCountdown'
import { formatDateTime, liveMinuteLabel, outcomeLabel } from '@/lib/format'
import { ApiError } from '@/lib/api'

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
  // A colour-coded border tells the state apart at a glance.
  const statusBorder =
    finished && fixture.myPoints != null
      ? fixture.myPoints >= 3
        ? 'border-emerald-500/45'
        : fixture.myPoints > 0
          ? 'border-amber-500/45'
          : 'border-rose-500/45'
      : live
        ? 'border-amber-400/50'
        : !locked
          ? 'border-brand-500/30'
          : 'border-ink-800'
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
    <Card className={`border transition duration-200 ${statusBorder}`}>
      <CardBody className="space-y-3">
        {/* header */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 truncate text-ink-400">
            <TeamLogo apiId={fixture.leagueApiId} kind="league" size={15} />
            <span className="truncate">{fixture.leagueName}</span>
          </span>
          <span className="flex items-center gap-1.5">
            {live ? (
              <Badge tone="loss">{liveMinuteLabel(fixture.status, fixture.elapsed)}</Badge>
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
                className="rounded p-0.5 text-ink-500 transition hover:text-loss"
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
            <span className="truncate text-sm font-medium text-ink-100">{fixture.homeName}</span>
          </div>
          {showResult ? (
            <span className="shrink-0 text-lg font-bold tabular-nums text-ink-100">
              {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
            </span>
          ) : (
            <span className="shrink-0 text-xs text-ink-500">{formatDateTime(fixture.kickoffAt)}</span>
          )}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right text-sm font-medium text-ink-100">
              {fixture.awayName}
            </span>
            <TeamLogo apiId={fixture.awayApiId} size={26} />
          </div>
        </div>

        {locked ? (
          /* locked — my pick + everyone else's, revealed now that it's kicked off */
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-ink-850 px-3 py-2 text-sm">
              {fixture.myOutcome ? (
                <span className="text-ink-200">
                  Tahminin:{' '}
                  <span className="font-medium text-ink-100">
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
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-700 py-1.5 text-xs font-medium text-ink-300 transition hover:border-brand-500/50 hover:text-brand-300"
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
                <span className="font-semibold text-ink-100">
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
              <OutcomeButton active={outcome === 'HOME'} onClick={() => pickOutcome('HOME')}>
                <TeamLogo apiId={fixture.homeApiId} size={20} />
                <span>Ev</span>
              </OutcomeButton>
              <OutcomeButton active={outcome === 'DRAW'} onClick={() => pickOutcome('DRAW')}>
                <span className="text-base font-black">X</span>
                <span>Beraberlik</span>
              </OutcomeButton>
              <OutcomeButton active={outcome === 'AWAY'} onClick={() => pickOutcome('AWAY')}>
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
        <span className="font-medium text-ink-100">{pick}</span>
        {p.pointsAwarded != null && <Badge tone={pointsTone(p.pointsAwarded)}>{p.pointsAwarded}</Badge>}
      </span>
    </li>
  )
}

function OutcomeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-semibold transition ${
        active
          ? 'scale-[1.03] border-brand-300 bg-gradient-to-b from-brand-400 to-emerald-500 text-ink-950 shadow-md shadow-brand-950/50 ring-1 ring-brand-300/60'
          : 'border-ink-700 bg-ink-850 text-ink-300 hover:border-brand-500/40 hover:bg-ink-800 hover:text-ink-100'
      }`}
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
