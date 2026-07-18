import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Flag, Play, ChevronDown, Plus } from 'lucide-react'
import { useCreateGame, useFinishGame, useGameDetail, useGames } from './hooks'
import type { SeasonSummary } from './types'
import { Leaderboard } from './Leaderboard'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'

// The group's games hub: several can run at once. Admin creates/ends them; anyone
// jumps into predictions for a game.
export function GameManager({
  groupId,
  isAdmin,
  currentUserId,
}: {
  groupId: number
  isAdmin: boolean
  currentUserId?: number
}) {
  const games = useGames(groupId)
  const create = useCreateGame(groupId)
  const active = (games.data ?? []).filter((g) => g.status === 'active')
  const finished = (games.data ?? []).filter((g) => g.status === 'finished')

  return (
    <Card>
      <CardHeader
        title="Oyunlar"
        action={
          isAdmin && (
            <Button size="sm" variant="secondary" disabled={create.isPending} onClick={() => create.mutate(undefined)}>
              <Plus className="h-4 w-4" /> Yeni Oyun
            </Button>
          )
        }
      />
      <CardBody className="space-y-2">
        {games.isLoading ? (
          <Skeleton className="h-20" />
        ) : active.length === 0 ? (
          <p className="text-sm text-ink-400">Şu an açık oyun yok.</p>
        ) : (
          active.map((g) => (
            <ActiveGameRow key={g.id} groupId={groupId} game={g} isAdmin={isAdmin} />
          ))
        )}

        {finished.length > 0 && (
          <div className="space-y-1 border-t border-ink-800 pt-3">
            <div className="section-label mb-1 text-xs text-ink-500">Geçmiş oyunlar</div>
            {finished.map((g) => (
              <FinishedGameRow key={g.id} groupId={groupId} game={g} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function ActiveGameRow({ groupId, game, isAdmin }: { groupId: number; game: SeasonSummary; isAdmin: boolean }) {
  const finish = useFinishGame(groupId, game.id)
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="rounded-lg bg-ink-850 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
          <Play className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-100">{game.title}</div>
          <div className="text-xs text-ink-400">{game.matchCount} maç · devam ediyor</div>
        </div>
        <Link to="/group">
          <Button size="sm" variant="secondary">
            Tahminler
          </Button>
        </Link>
      </div>
      {isAdmin &&
        (confirming ? (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2">
            <span className="text-sm text-ink-200">Bitir, lider şampiyon olsun mu?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={finish.isPending}
                onClick={() => finish.mutate(undefined, { onSuccess: () => setConfirming(false) })}
              >
                <Flag className="h-4 w-4" /> Bitir
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-loss hover:brightness-110"
          >
            <Flag className="h-3.5 w-3.5" /> Oyunu Bitir
          </button>
        ))}
    </div>
  )
}

function FinishedGameRow({
  groupId,
  game,
  currentUserId,
}: {
  groupId: number
  game: SeasonSummary
  currentUserId?: number
}) {
  const [open, setOpen] = useState(false)
  const detail = useGameDetail(groupId, open ? game.id : null)
  return (
    <div className="rounded-lg bg-ink-850">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
        <span className="text-sm font-medium text-ink-100">{game.title}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-400">
          {game.championName ? (
            <>🏆 {game.championName}{game.championPoints != null && ` · ${game.championPoints} puan`}</>
          ) : (
            'şampiyon yok'
          )}
        </span>
        <span className="hidden shrink-0 text-[11px] text-ink-500 sm:inline">
          {game.finishedAt ? formatDate(game.finishedAt) : ''}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-500 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-ink-800 px-3 py-3">
          {detail.isLoading || !detail.data ? (
            <Skeleton className="h-32" />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-ink-800">
                <Leaderboard entries={detail.data.standings} currentUserId={currentUserId} />
              </div>
              {detail.data.fixtures.length > 0 && (
                <ul className="space-y-0.5">
                  {detail.data.fixtures.map((f) => (
                    <li key={f.fixtureId} className="flex items-center gap-2 py-0.5 text-xs">
                      <TeamLogo apiId={f.homeApiId} size={14} />
                      <span className="min-w-0 flex-1 truncate text-right text-ink-300">{f.homeName}</span>
                      <span className="score-num shrink-0 text-ink-100">
                        {f.homeScore ?? '-'}:{f.awayScore ?? '-'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink-300">{f.awayName}</span>
                      <TeamLogo apiId={f.awayApiId} size={14} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function SeasonBadge({ status }: { status: 'active' | 'finished' }) {
  return <Badge tone={status === 'active' ? 'brand' : 'neutral'}>{status === 'active' ? 'Aktif' : 'Bitti'}</Badge>
}
