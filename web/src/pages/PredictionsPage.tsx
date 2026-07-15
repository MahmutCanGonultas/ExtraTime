import { Link } from 'react-router-dom'
import {
  useGroup,
  useGroupFixtures,
  useRemoveGroupFixture,
} from '@/features/groups/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { GamePredictCard } from '@/features/predictions/GamePredictCard'
import { HowToPlay } from '@/features/predictions/HowToPlay'
import { AddMatchesPanel } from '@/features/predictions/AddMatchesPanel'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'

export function PredictionsPage() {
  const { active, isLoading: groupLoading } = useActiveGroup()
  const groupId = active?.id ?? 0
  const detail = useGroup(groupId)
  const fixturesQ = useGroupFixtures(groupId)
  const removeFixture = useRemoveGroupFixture(groupId)

  if (groupLoading) return <Skeleton className="h-64" />
  if (!active) {
    return (
      <EmptyState
        title="Önce bir gruba katıl"
        description="Tahmin oynamak için bir grup gerekiyor."
        action={
          <Link to="/group">
            <Button>Gruba git</Button>
          </Link>
        }
      />
    )
  }

  const isAdmin = detail.data?.isAdmin ?? false
  const activeSeason = detail.data?.activeSeason ?? null
  const games = fixturesQ.data ?? []
  const openGames = games.filter((g) => g.open)
  const closedGames = games.filter((g) => !g.open)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Tahminler</h1>
        <p className="text-sm text-ink-400">
          {active.name}
          {activeSeason ? ` · ${activeSeason.title}` : ''}
        </p>
      </div>

      {!activeSeason ? (
        <EmptyState
          title="Şu an açık oyun yok"
          description={
            isAdmin
              ? 'Grup sayfasından yeni bir oyun başlatabilirsin.'
              : 'Başkan yeni oyunu başlatınca burada maçlar görünecek.'
          }
          action={
            <Link to="/group">
              <Button>Grup sayfası</Button>
            </Link>
          }
        />
      ) : (
        <>
          <HowToPlay />

          {isAdmin && <AddMatchesPanel groupId={groupId} />}

          {fixturesQ.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
          ) : games.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="Henüz maç yok"
                  description={
                    isAdmin
                      ? 'Yukarıdaki “Oyuna maç ekle” ile maçları oyununa ekle.'
                      : 'Başkan maçları ekleyince burada tahmin girebilirsin.'
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <>
              {openGames.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
                    Tahmin bekleyenler · {openGames.length}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {openGames.map((f) => (
                      <GamePredictCard
                        key={f.fixtureId}
                        fixture={f}
                        groupId={groupId}
                        onRemove={
                          isAdmin ? () => removeFixture.mutate(f.fixtureId) : undefined
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {closedGames.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
                    Kilitli & sonuçlanan · {closedGames.length}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {closedGames.map((f) => (
                      <GamePredictCard key={f.fixtureId} fixture={f} groupId={groupId} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
