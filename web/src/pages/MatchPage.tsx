import { useParams } from 'react-router-dom'
import { useFixture } from '@/features/football/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useFixturePredictions } from '@/features/groups/hooks'
import { isCancelled, isFinished, isLive, isPostponed } from '@/features/football/matchStatus'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, EmptyState, ErrorState } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'

function StatusBadge({ status }: { status: string }) {
  if (isLive(status)) return <Badge tone="win">Canlı</Badge>
  if (isPostponed(status)) return <Badge tone="warning">Ertelendi</Badge>
  if (isCancelled(status)) return <Badge tone="loss">İptal</Badge>
  return <Badge tone="neutral">Yaklaşan</Badge>
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

  const f = fixture.data
  const finished = isFinished(f.status)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardBody>
          <div className="mb-3 text-center text-xs text-ink-400">
            {formatDateTime(f.kickoffAt)}
            {f.round ? ` · ${f.round}` : ''}
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-1 flex-col items-center gap-2">
              <TeamLogo apiId={f.home.apiFootballId} size={48} />
              <span className="text-center text-sm font-medium text-ink-100">{f.home.name}</span>
            </div>
            <div className="text-center">
              {finished ? (
                <div className="text-3xl font-bold tabular-nums text-ink-100">
                  {f.homeScore} - {f.awayScore}
                </div>
              ) : (
                <StatusBadge status={f.status} />
              )}
              {finished && f.halftimeHome != null && (
                <div className="mt-1 text-xs text-ink-500">
                  İY {f.halftimeHome}-{f.halftimeAway}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col items-center gap-2">
              <TeamLogo apiId={f.away.apiFootballId} size={48} />
              <span className="text-center text-sm font-medium text-ink-100">{f.away.name}</span>
            </div>
          </div>
        </CardBody>
      </Card>

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
                  <Td className="text-center font-mono tabular-nums">
                    {p.predictedHome}-{p.predictedAway}
                  </Td>
                  <Td className="text-center font-bold text-ink-100">{p.pointsAwarded ?? '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
