import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  useCreateGame,
  useGameDetail,
  useGames,
  useGroup,
  useRemoveGameFixture,
} from '@/features/groups/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useAuth } from '@/features/auth/AuthContext'
import { GamePredictCard } from '@/features/predictions/GamePredictCard'
import { HowToPlay } from '@/features/predictions/HowToPlay'
import { AddMatchesPanel } from '@/features/predictions/AddMatchesPanel'
import { LiveStandings } from '@/features/groups/LiveStandings'
import { Leaderboard } from '@/features/groups/Leaderboard'
import { WeeklyChampions } from '@/features/groups/WeeklyChampions'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

export function PredictionsPage() {
  const { active, isLoading: groupLoading } = useActiveGroup()
  const { user } = useAuth()
  const groupId = active?.id ?? 0
  const detail = useGroup(groupId)
  const isAdmin = detail.data?.isAdmin ?? false
  const gamesQ = useGames(groupId)
  const createGame = useCreateGame(groupId)

  const activeGames = (gamesQ.data ?? []).filter((g) => g.status === 'active')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const gameId = selectedId ?? activeGames[0]?.id ?? null
  const gameDetail = useGameDetail(groupId, gameId)
  const removeFixture = useRemoveGameFixture(groupId, gameId ?? 0)

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

  const fixtures = gameDetail.data?.fixtures ?? []
  const openGames = fixtures.filter((f) => f.open)
  const closedGames = fixtures.filter((f) => !f.open)
  const predicted = openGames.filter((f) => f.myOutcome != null).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Tahminler</h1>
        <p className="text-sm text-ink-400">{active.name}</p>
      </div>

      {activeGames.length === 0 ? (
        <EmptyState
          title="Açık oyun yok"
          description={
            isAdmin ? 'Yeni bir oyun başlat ve maçları ekle.' : 'Başkan oyun açınca burada görünür.'
          }
          action={
            isAdmin ? (
              <Button onClick={() => createGame.mutate(undefined)} disabled={createGame.isPending}>
                <Plus className="h-4 w-4" /> Yeni Oyun
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* game tabs */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            {activeGames.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition',
                  g.id === gameId ? 'bg-brand-500 text-ink-950' : 'bg-ink-850 text-ink-300 hover:text-ink-100',
                )}
              >
                {g.title}
                <span className="ml-1.5 text-xs opacity-70">{g.matchCount}</span>
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => createGame.mutate(undefined)}
                disabled={createGame.isPending}
                className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-ink-700 px-3 py-1.5 text-sm text-ink-400 hover:border-ink-600 hover:text-ink-200"
              >
                <Plus className="h-3.5 w-3.5" /> Yeni Oyun
              </button>
            )}
          </div>

          {/* progress */}
          {openGames.length > 0 && (
            <div className="max-w-sm">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-400">
                  {predicted}/{openGames.length} maç tahmin edildi
                </span>
                <span className="font-medium text-brand-300">
                  {predicted < openGames.length ? `${openGames.length - predicted} kaldı` : 'Hepsi tamam ✓'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${openGames.length ? (predicted / openGames.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <HowToPlay />
          {gameId != null && <LiveStandings groupId={groupId} gameId={gameId} currentUserId={user?.id} />}
          {isAdmin && gameId != null && <AddMatchesPanel groupId={groupId} gameId={gameId} />}

          {gameDetail.isLoading ? (
            <Skeleton className="h-56" />
          ) : fixtures.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="Henüz maç yok"
                  description={
                    isAdmin
                      ? 'Yukarıdaki “Oyuna maç ekle” ile maçları oyununa ekle.'
                      : 'Başkan maçları ekleyince tahmin girebilirsin.'
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <>
              {openGames.length > 0 && (
                <section>
                  <h2 className="section-label mb-2 text-sm text-ink-400">
                    Tahmin bekleyenler · {openGames.length}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {openGames.map((f) => (
                      <GamePredictCard
                        key={f.fixtureId}
                        fixture={f}
                        groupId={groupId}
                        gameId={gameId!}
                        onRemove={isAdmin ? () => removeFixture.mutate(f.fixtureId) : undefined}
                      />
                    ))}
                  </div>
                </section>
              )}

              {closedGames.length > 0 && (
                <section>
                  <h2 className="section-label mb-2 text-sm text-ink-400">
                    Kilitli & sonuçlanan · {closedGames.length}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {closedGames.map((f) => (
                      <GamePredictCard key={f.fixtureId} fixture={f} groupId={groupId} gameId={gameId!} />
                    ))}
                  </div>
                </section>
              )}

              {gameDetail.data && gameDetail.data.standings.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader title="Bu oyunun sıralaması" />
                  <Leaderboard entries={gameDetail.data.standings} currentUserId={user?.id} />
                </Card>
              )}

              {gameDetail.data && gameDetail.data.weeks.length > 0 && (
                <WeeklyChampions
                  weeks={gameDetail.data.weeks}
                  overallLeader={gameDetail.data.standings[0] ?? null}
                  currentUserId={user?.id}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
