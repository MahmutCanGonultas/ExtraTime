import { useParams } from 'react-router-dom'
import { useFixture } from '@/features/football/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useFixturePredictions } from '@/features/groups/hooks'
import type { Outcome } from '@/features/groups/types'
import { isCancelled, isFinished, isLive, isPostponed } from '@/features/football/matchStatus'
import { GoalList } from '@/features/football/GoalList'
import { MatchSummary } from '@/features/football/MatchSummary'
import { PredictionPulse } from '@/features/predictions/PredictionPulse'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, EmptyState, ErrorState } from '@/components/ui/feedback'
import { formatDateTime, liveMinuteLabel } from '@/lib/format'

function StatusBadge({ status, elapsed }: { status: string; elapsed: number | null }) {
  if (isLive(status)) return <Badge tone="loss">{liveMinuteLabel(status, elapsed)}</Badge>
  if (isPostponed(status)) return <Badge tone="warning">Ertelendi</Badge>
  if (isCancelled(status)) return <Badge tone="loss">İptal</Badge>
  return <Badge tone="neutral">Yaklaşan</Badge>
}

const outcomeShort: Record<Outcome, string> = { HOME: '1', DRAW: 'X', AWAY: '2' }

function pointsTone(points: number): 'win' | 'warning' | 'loss' {
  if (points >= 3) return 'win'
  if (points > 0) return 'warning'
  return 'loss'
}

// Turkish, tidy labels for the API's English round names.
function roundLabel(round: string): string {
  const map: Record<string, string> = {
    Final: 'Final',
    'Semi-finals': 'Yarı Final',
    'Quarter-finals': 'Çeyrek Final',
    'Round of 16': 'Son 16',
    'Round of 32': 'Son 32',
    'Group Stage': 'Grup Aşaması',
    'Play-off Round': 'Play-off',
    'Play-offs': 'Play-off',
    'Knockout Round Play-offs': 'Play-off',
    'Preliminary Round': 'Ön Tur',
  }
  if (map[round]) return map[round]
  const q = round.match(/^(\d+)(?:st|nd|rd|th)\s+Qualifying Round$/i)
  if (q) return `${q[1]}. Ön Eleme`
  const w = round.match(/Regular Season\s*-\s*(\d+)/i)
  if (w) return `${w[1]}. Hafta`
  const ls = round.match(/League Stage\s*-\s*(\d+)/i)
  if (ls) return `Lig Aşaması · ${ls[1]}`
  return round
}

export function MatchPage() {
  const { id } = useParams()
  const fixtureId = Number(id)
  const fixture = useFixture(fixtureId)
  const { active } = useActiveGroup()
  const preds = useFixturePredictions(active?.id ?? 0, fixtureId)

  if (fixture.isLoading) return <Skeleton className="h-64" />
  if (fixture.isError) return <ErrorState onRetry={() => fixture.refetch()} />
  if (!fixture.data) return <EmptyState title="Maç bulunamadı" />

  const f = fixture.data.fixture
  const goals = fixture.data.goals
  const events = fixture.data.events ?? []
  const stats = fixture.data.stats ?? []
  const finished = isFinished(f.status)
  const live = isLive(f.status)
  const showScore = finished || live
  const homeGoals = goals.filter((g) => g.teamApiId === f.home.apiFootballId)
  const awayGoals = goals.filter((g) => g.teamApiId === f.away.apiFootballId)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardBody>
          <div className="mb-4 flex justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-ink-800 bg-ink-850 px-3.5 py-1.5 shadow-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white p-0.5">
                <TeamLogo apiId={f.leagueApiId} kind="league" size={18} />
              </span>
              <span className="truncate text-sm font-bold text-ink-100">{f.leagueName}</span>
              {f.round && (
                <>
                  <span className="text-ink-600">·</span>
                  <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-200">
                    {roundLabel(f.round)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <TeamLogo apiId={f.home.apiFootballId} size={52} />
              <span className="w-full break-words text-center text-sm font-medium text-ink-100">{f.home.name}</span>
            </div>
            <div className="text-center">
              {showScore ? (
                <>
                  <div className="score-num text-5xl text-ink-100">
                    {f.homeScore ?? 0}
                    <span className="mx-1 text-ink-600">:</span>
                    {f.awayScore ?? 0}
                  </div>
                  {live ? (
                    <div className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-loss">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
                      </span>
                      {liveMinuteLabel(f.status, f.elapsed)}
                    </div>
                  ) : (
                    f.halftimeHome != null && (
                      <div className="mt-1 text-xs text-ink-500">
                        İY {f.halftimeHome}-{f.halftimeAway}
                      </div>
                    )
                  )}
                </>
              ) : (
                <StatusBadge status={f.status} elapsed={f.elapsed} />
              )}
              {!showScore && (
                <div className="mt-1 text-xs text-ink-500">{formatDateTime(f.kickoffAt)}</div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <TeamLogo apiId={f.away.apiFootballId} size={52} />
              <span className="w-full break-words text-center text-sm font-medium text-ink-100">{f.away.name}</span>
            </div>
          </div>

          {goals.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-800 pt-3">
              <GoalList goals={homeGoals} />
              <div className="flex flex-col items-end [&_li]:flex-row-reverse">
                <GoalList goals={awayGoals} />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {(finished || live) && <MatchSummary events={events} stats={stats} home={f.home} away={f.away} />}

      <Card>
        <CardHeader title="Grup Tahminleri" />
        {!active ? (
          <EmptyState title="Grup yok" description="Tahminleri görmek için bir gruba katıl." />
        ) : preds.isLoading ? (
          <Skeleton className="m-4 h-28" />
        ) : !preds.data ? (
          <EmptyState title="—" />
        ) : !preds.data.locked ? (
          <EmptyState
            title="Tahminler gizli"
            description="Gizlilik gereği, herkesin tahmini maç başladığında görünür olur."
          />
        ) : preds.data.predictions.length === 0 ? (
          <EmptyState title="Bu maça kimse tahmin girmemiş" />
        ) : (
          <>
            <PredictionPulse
              predictions={preds.data.predictions}
              homeName={f.home.name}
              awayName={f.away.name}
            />
            <Table>
            <thead>
              <tr>
                <Th>Üye</Th>
                <Th className="text-center">Tahmin</Th>
                <Th className="text-center">Puan</Th>
              </tr>
            </thead>
            <tbody>
              {preds.data.predictions.map((p) => (
                <Tr key={p.userId}>
                  <Td className="text-ink-100">{p.displayName}</Td>
                  <Td className="text-center font-mono tabular-nums text-ink-200">
                    {p.predictedHome != null
                      ? `${p.predictedHome}-${p.predictedAway}`
                      : outcomeShort[p.predictedOutcome]}
                  </Td>
                  <Td className="text-center">
                    {p.pointsAwarded != null ? (
                      <Badge tone={pointsTone(p.pointsAwarded)}>{p.pointsAwarded}</Badge>
                    ) : (
                      '—'
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          </>
        )}
      </Card>
    </div>
  )
}
