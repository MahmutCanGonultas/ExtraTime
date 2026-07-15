import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Flag, Play, ChevronDown, Crown } from 'lucide-react'
import {
  useFinishGame,
  useNewGame,
  useSeasonDetail,
  useSeasons,
} from './hooks'
import type { SeasonRef, SeasonSummary } from './types'
import { Leaderboard } from './Leaderboard'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'

// Admin controls for the current game (end it / start a new one) plus the state
// banner everyone sees.
export function GameManager({
  groupId,
  isAdmin,
  activeSeason,
  currentUserId,
}: {
  groupId: number
  isAdmin: boolean
  activeSeason: SeasonRef | null
  currentUserId?: number
}) {
  const finish = useFinishGame(groupId)
  const newGame = useNewGame(groupId)
  const [confirming, setConfirming] = useState(false)

  return (
    <Card>
      <CardHeader title="Oyun" />
      <CardBody className="space-y-3">
        {activeSeason ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                  <Play className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink-100">{activeSeason.title}</div>
                  <div className="text-xs text-ink-400">Devam ediyor</div>
                </div>
              </div>
              <Link to="/predictions">
                <Button size="sm" variant="secondary">
                  Tahminlere git
                </Button>
              </Link>
            </div>

            {isAdmin &&
              (confirming ? (
                <div className="flex items-center justify-between rounded-lg bg-ink-850 px-3 py-2">
                  <span className="text-sm text-ink-200">Oyunu bitir, lider şampiyon olsun mu?</span>
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
                      <Flag className="h-4 w-4" /> Evet, bitir
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-loss" onClick={() => setConfirming(true)}>
                  <Flag className="h-4 w-4" /> Oyunu Bitir
                </Button>
              ))}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-ink-300">Şu an açık bir oyun yok.</div>
            {isAdmin && (
              <Button size="sm" disabled={newGame.isPending} onClick={() => newGame.mutate(undefined)}>
                <Play className="h-4 w-4" /> Yeni Oyun Başlat
              </Button>
            )}
          </div>
        )}

        {finish.data?.champion && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
            <Crown className="h-6 w-6 shrink-0 text-amber-300" />
            <div className="text-sm text-ink-100">
              <span className="font-bold text-amber-300">{finish.data.champion.displayName}</span>{' '}
              şampiyon oldu! · {finish.data.champion.points} puan
            </div>
          </div>
        )}

        <SeasonHistory groupId={groupId} currentUserId={currentUserId} />
      </CardBody>
    </Card>
  )
}

function SeasonHistory({ groupId, currentUserId }: { groupId: number; currentUserId?: number }) {
  const seasons = useSeasons(groupId)
  const finished = (seasons.data ?? []).filter((s) => s.status === 'finished')
  if (finished.length === 0) return null

  return (
    <div className="space-y-1 border-t border-ink-800 pt-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
        Geçmiş oyunlar
      </div>
      {finished.map((s) => (
        <SeasonRow key={s.id} groupId={groupId} season={s} currentUserId={currentUserId} />
      ))}
    </div>
  )
}

function SeasonRow({
  groupId,
  season,
  currentUserId,
}: {
  groupId: number
  season: SeasonSummary
  currentUserId?: number
}) {
  const [open, setOpen] = useState(false)
  const detail = useSeasonDetail(groupId, open ? season.id : null)

  return (
    <div className="rounded-lg bg-ink-850">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
        <span className="text-sm font-medium text-ink-100">{season.title}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-400">
          {season.championName ? (
            <>
              🏆 {season.championName}
              {season.championPoints != null && ` · ${season.championPoints} puan`}
            </>
          ) : (
            'şampiyon yok'
          )}
        </span>
        <span className="hidden shrink-0 text-[11px] text-ink-500 sm:inline">
          {season.finishedAt ? formatDate(season.finishedAt) : ''}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-500 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-ink-800 px-3 py-3">
          {detail.isLoading || !detail.data ? (
            <Skeleton className="h-32" />
          ) : (
            <>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Puan durumu
                </div>
                <div className="overflow-hidden rounded-lg border border-ink-800">
                  <Leaderboard entries={detail.data.standings} currentUserId={currentUserId} />
                </div>
              </div>
              {detail.data.fixtures.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Sonuçlar
                  </div>
                  <ul className="space-y-0.5">
                    {detail.data.fixtures.map((f) => (
                      <li key={f.fixtureId} className="flex items-center gap-2 py-0.5 text-xs">
                        <TeamLogo apiId={f.homeApiId} size={14} />
                        <span className="min-w-0 flex-1 truncate text-right text-ink-300">
                          {f.homeName}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-ink-100">
                          {f.homeScore ?? '-'}:{f.awayScore ?? '-'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-ink-300">{f.awayName}</span>
                        <TeamLogo apiId={f.awayApiId} size={14} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Re-export the status badge shape used by GroupPage header.
export function SeasonBadge({ activeSeason }: { activeSeason: SeasonRef | null }) {
  if (!activeSeason) return <Badge tone="neutral">Oyun yok</Badge>
  return <Badge tone="brand">{activeSeason.title}</Badge>
}
