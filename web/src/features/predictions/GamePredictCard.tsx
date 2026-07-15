import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Plus, Check, X } from 'lucide-react'
import type { GameFixture, Outcome } from '@/features/groups/types'
import { useUpsertPrediction } from '@/features/groups/hooks'
import { isFinished, isLive } from '@/features/football/matchStatus'
import { TeamLogo } from '@/components/TeamLogo'
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
  onRemove,
}: {
  fixture: GameFixture
  groupId: number
  onRemove?: () => void
}) {
  const countdown = useCountdown(fixture.kickoffAt)
  const upsert = useUpsertPrediction(groupId)
  const [outcome, setOutcome] = useState<Outcome | null>(fixture.myOutcome)
  const [home, setHome] = useState(fixture.myHome != null ? String(fixture.myHome) : '')
  const [away, setAway] = useState(fixture.myAway != null ? String(fixture.myAway) : '')
  const [showScore, setShowScore] = useState(fixture.myHome != null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const live = isLive(fixture.status)
  const finished = isFinished(fixture.status)
  const showResult = live || finished
  const locked = !fixture.open

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
  const canSave = outcome !== null && !locked && !upsert.isPending

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
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi')
    }
  }

  return (
    <Card>
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

        {!locked ? (
          <>
            {/* who wins — the main pick */}
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

            {/* optional exact score for the bonus */}
            {showScore ? (
              <div className="flex items-center justify-center gap-2">
                <ScoreBox value={home} onChange={(v) => editScore({ h: v })} />
                <span className="text-ink-500">-</span>
                <ScoreBox value={away} onChange={(v) => editScore({ a: v })} />
                <span className="ml-1 text-xs text-ink-500">tam skor = 5 puan</span>
              </div>
            ) : (
              <button
                onClick={() => setShowScore(true)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-700 py-1.5 text-xs text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
              >
                <Plus className="h-3.5 w-3.5" /> Skor tahmini ekle (bonus puan)
              </button>
            )}

            <div className="flex items-center justify-between">
              {error ? (
                <span className="text-xs text-loss">{error}</span>
              ) : saved ? (
                <span className="flex items-center gap-1 text-xs text-brand-300">
                  <Check className="h-3.5 w-3.5" /> Kaydedildi
                </span>
              ) : (
                <span className="text-xs text-ink-500">{fixture.predictionCount} tahmin</span>
              )}
              <Button size="sm" onClick={save} disabled={!canSave}>
                {upsert.isPending ? '...' : 'Kaydet'}
              </Button>
            </div>
          </>
        ) : (
          /* locked — show my pick and, once settled, the points */
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
            {fixture.myPoints != null ? (
              <Badge tone={pointsTone(fixture.myPoints)}>{fixture.myPoints} puan</Badge>
            ) : (
              <Link to={`/matches/${fixture.fixtureId}`} className="text-xs text-brand-300 hover:underline">
                Herkesin tahmini →
              </Link>
            )}
          </div>
        )}
      </CardBody>
    </Card>
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
      className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition ${
        active
          ? 'border-brand-500 bg-brand-500/15 text-brand-200'
          : 'border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:text-ink-100'
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
