import { useMemo, useState } from 'react'
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
        active
          ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
          : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600 hover:text-ink-100',
      )}
    >
      {children}
    </button>
  )
}

// Full audit of how every point in the game was earned: settled predictions (self)
// and admin adjustments (given), newest first — filterable per person.
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
  const [filter, setFilter] = useState<number | 'all'>('all')

  // The distinct people who appear in the history, for the per-person filter.
  const members = useMemo(() => {
    const m = new Map<number, { userId: number; displayName: string; avatar: string | null }>()
    for (const e of events) {
      if (!m.has(e.userId)) {
        m.set(e.userId, { userId: e.userId, displayName: e.displayName, avatar: e.avatar })
      }
    }
    return [...m.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'))
  }, [events])

  const shown = filter === 'all' ? events : events.filter((e) => e.userId === filter)

  return (
    <Card className="overflow-hidden border-sky-500/20">
      <div className="flex items-center gap-2 border-b border-sky-500/15 bg-sky-500/[0.06] px-4 py-3">
        <History className="h-4 w-4 text-sky-300" />
        <h3 className="section-label text-sm text-sky-200">Puan Geçmişi</h3>
      </div>

      {members.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-ink-850 px-3 py-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Herkes
          </FilterChip>
          {members.map((m) => (
            <FilterChip
              key={m.userId}
              active={filter === m.userId}
              onClick={() => setFilter(m.userId)}
            >
              <MemberAvatar name={m.displayName} avatar={m.avatar} size={18} />
              <span className="max-w-[90px] truncate">
                {m.userId === currentUserId ? 'Sen' : m.displayName}
              </span>
            </FilterChip>
          ))}
        </div>
      )}

      {q.isLoading ? (
        <Skeleton className="m-3 h-24" />
      ) : events.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-500">
          Henüz puan kazanılmadı. Maçlar sonuçlandıkça burada listelenir.
        </p>
      ) : shown.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-500">Bu oyuncu için kayıt yok.</p>
      ) : (
        <ul className="max-h-[520px] divide-y divide-ink-850 overflow-y-auto">
          {shown.map((e, i) => (
            <HistoryRow key={i} e={e} isMe={e.userId === currentUserId} />
          ))}
        </ul>
      )}
    </Card>
  )
}
