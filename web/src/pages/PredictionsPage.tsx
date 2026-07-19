import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronDown } from 'lucide-react'
import {
  useCreateGame,
  useGameDetail,
  useGames,
  useGroup,
  useRemoveGameFixture,
} from '@/features/groups/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { GamePredictCard } from '@/features/predictions/GamePredictCard'
import { AddMatchesPanel } from '@/features/predictions/AddMatchesPanel'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

export function PredictionsPage() {
  const { active, isLoading: groupLoading } = useActiveGroup()
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

          {/* Vibrant game hero — the group + your progress, front and centre, so
              predicting is the obvious first thing you do here. */}
          {openGames.length > 0 && (
            <section className="relative overflow-hidden rounded-card border border-brand-500/25 bg-gradient-to-br from-brand-500/20 via-ink-900 to-ink-950 px-5 py-4">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(90% 130% at 100% 0%, rgba(194,245,66,0.20), transparent 55%)',
                }}
              />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
                    {active.name} · tahmin oyunu
                  </div>
                  <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-white">
                    {predicted === openGames.length ? 'Tüm tahminlerin hazır 🎯' : 'Tahminlerini gir'}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-300">
                    {predicted}/{openGames.length} maç tahmin edildi
                    {predicted < openGames.length && (
                      <span className="font-semibold text-brand-300">
                        {' '}
                        · {openGames.length - predicted} maç kaldı
                      </span>
                    )}
                  </p>
                </div>
                <div className="score-num shrink-0 text-right">
                  <span className="text-4xl font-black tabular-nums text-brand-300">{predicted}</span>
                  <span className="text-xl font-bold text-ink-500">/{openGames.length}</span>
                </div>
              </div>
              <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-ink-950/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-emerald-500 transition-all"
                  style={{ width: `${openGames.length ? (predicted / openGames.length) * 100 : 0}%` }}
                />
              </div>
            </section>
          )}

          {/* Just the matches — standings, weekly champions and points history live
              on the Puanlar tab, so this screen stays focused on predicting. */}
          <div className="space-y-6">
            {isAdmin && gameId != null && (
              <details className="group overflow-hidden rounded-card border border-sky-500/25 bg-sky-500/[0.04]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-sky-200">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Oyuna maç ekle
                  </span>
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-ink-800">
                  <AddMatchesPanel groupId={groupId} gameId={gameId} />
                </div>
              </details>
            )}

            {gameDetail.isLoading ? (
              <Skeleton className="h-56" />
            ) : fixtures.length === 0 ? (
              <Card>
                <CardBody>
                  <EmptyState
                    title="Henüz maç yok"
                    description={
                      isAdmin
                        ? '“Oyuna maç ekle” ile maçları oyununa ekle.'
                        : 'Başkan maçları ekleyince tahmin girebilirsin.'
                    }
                  />
                </CardBody>
              </Card>
            ) : (
              <>
                {openGames.length > 0 && (
                  <section className="rounded-card border border-brand-500/25 bg-brand-500/[0.04] p-3 sm:p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-300">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-xs tabular-nums">
                        {openGames.length}
                      </span>
                      Tahmin bekleyenler
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
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
                  <section className="rounded-card border border-ink-800 bg-ink-900/40 p-3 sm:p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-300">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-800 text-xs tabular-nums">
                        {closedGames.length}
                      </span>
                      Kilitli & sonuçlanan
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      {closedGames.map((f) => (
                        <GamePredictCard key={f.fixtureId} fixture={f} groupId={groupId} gameId={gameId!} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
