import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { useGameDetail, useGames } from '@/features/groups/hooks'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useAuth } from '@/features/auth/AuthContext'
import { LiveStandings } from '@/features/groups/LiveStandings'
import { Leaderboard } from '@/features/groups/Leaderboard'
import { WeeklyChampions } from '@/features/groups/WeeklyChampions'
import { HowToPlay } from '@/features/predictions/HowToPlay'
import { PointsHistory } from '@/features/predictions/PointsHistory'
import { Card } from '@/components/ui/Card'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

// The "Puanlar" tab: everything about scores — live standings, the game table,
// weekly champions and the full point history — kept OFF the prediction screen so
// that one stays focused on predicting.
export function StandingsPage() {
  const { active, isLoading: groupLoading } = useActiveGroup()
  const { user } = useAuth()
  const groupId = active?.id ?? 0
  const gamesQ = useGames(groupId)
  const activeGames = (gamesQ.data ?? []).filter((g) => g.status === 'active')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const gameId = selectedId ?? activeGames[0]?.id ?? null
  const gameDetail = useGameDetail(groupId, gameId)

  if (groupLoading) return <Skeleton className="h-64" />
  if (!active) return <EmptyState title="Önce bir gruba katıl" />
  if (activeGames.length === 0)
    return (
      <EmptyState
        title="Açık oyun yok"
        description="Başkan bir oyun açıp maç ekleyince sıralama ve puanlar burada görünür."
      />
    )

  return (
    <div className="space-y-6">
      {activeGames.length > 1 && (
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
            </button>
          ))}
        </div>
      )}

      {gameId != null && <LiveStandings groupId={groupId} gameId={gameId} currentUserId={user?.id} />}

      {gameDetail.data && gameDetail.data.standings.length > 0 && (
        <Card className="overflow-hidden border-amber-500/20">
          <div className="flex items-center gap-2 border-b border-amber-500/15 bg-amber-500/[0.06] px-4 py-3">
            <Trophy className="h-4 w-4 text-amber-300" />
            <h3 className="section-label text-sm text-amber-200">Sıralama</h3>
          </div>
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

      {gameId != null && <PointsHistory groupId={groupId} gameId={gameId} currentUserId={user?.id} />}

      <HowToPlay />
    </div>
  )
}
