import { History, Gavel, Target } from 'lucide-react'
import { useGameHistory } from '@/features/groups/hooks'
import type { PointEvent } from '@/features/groups/types'
import { MemberAvatar } from '@/components/MemberAvatar'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/feedback'
import { formatDateTime, outcomeLabel } from '@/lib/format'
import { cn } from '@/lib/cn'

function predictionLabel(e: PointEvent): string {
  if (e.predictedHome != null && e.predictedAway != null) return `${e.predictedHome}-${e.predictedAway}`
  if (e.predictedOutcome) return outcomeLabel(e.predictedOutcome, e.homeName ?? '', e.awayName ?? '')
  return '—'
}

function PointsBadge({ e }: { e: PointEvent }) {
  const p = e.points
  const tone =
    e.type === 'adjustment'
      ? p >= 0
        ? 'bg-sky-500/15 text-sky-300'
        : 'bg-loss/15 text-loss'
      : p >= 5
        ? 'bg-emerald-500/15 text-emerald-300'
        : p > 0
          ? 'bg-amber-500/15 text-amber-300'
          : 'bg-ink-800 text-ink-400'
  const sign = e.type === 'adjustment' && p > 0 ? '+' : ''
  return (
    <span className={cn('score-num rounded-md px-2 py-0.5 text-sm font-bold tabular-nums', tone)}>
      {sign}
      {p}
    </span>
  )
}

function HistoryRow({ e, isMe }: { e: PointEvent; isMe: boolean }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <MemberAvatar name={e.displayName} avatar={e.avatar} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-100">
          {e.displayName}
          {isMe && <span className="ml-1 text-xs font-normal text-brand-300">(sen)</span>}
        </div>
        {e.type === 'prediction' ? (
          <div className="flex items-center gap-1 truncate text-[11px] text-ink-500">
            <Target className="h-3 w-3 shrink-0 text-ink-600" />
            <span className="truncate">
              {e.homeName} {e.homeScore}-{e.awayScore} {e.awayName} · tahmin {predictionLabel(e)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 truncate text-[11px] text-sky-300/80">
            <Gavel className="h-3 w-3 shrink-0" />
            <span className="truncate">
              Admin{e.byName ? ` (${e.byName})` : ''} verdi{e.reason ? ` · ${e.reason}` : ''}
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <PointsBadge e={e} />
        <div className="mt-0.5 text-[10px] text-ink-600">{formatDateTime(e.at)}</div>
      </div>
    </li>
  )
}

// Full audit of how every point in the game was earned: settled predictions (self)
// and admin adjustments (given), newest first.
export function PointsHistory({
  groupId,
  gameId,
  currentUserId,
}: {
  groupId: number
  gameId: number
  currentUserId?: number
}) {
  const q = useGameHistory(groupId, gameId)
  const events = q.data ?? []
  return (
    <Card className="overflow-hidden border-sky-500/20">
      <div className="flex items-center gap-2 border-b border-sky-500/15 bg-sky-500/[0.06] px-4 py-3">
        <History className="h-4 w-4 text-sky-300" />
        <h3 className="section-label text-sm text-sky-200">Puan Geçmişi</h3>
      </div>
      {q.isLoading ? (
        <Skeleton className="m-3 h-24" />
      ) : events.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-500">
          Henüz puan kazanılmadı. Maçlar sonuçlandıkça burada listelenir.
        </p>
      ) : (
        <ul className="max-h-[520px] divide-y divide-ink-850 overflow-y-auto">
          {events.map((e, i) => (
            <HistoryRow key={i} e={e} isMe={e.userId === currentUserId} />
          ))}
        </ul>
      )}
    </Card>
  )
}
