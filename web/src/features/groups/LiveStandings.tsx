import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useProvisionalLeaderboard } from './hooks'
import { MemberAvatar } from '@/components/MemberAvatar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

// "If the live scores froze right now" standings — only shown while curated
// matches are in progress. Points and ranks are provisional (never persisted).
export function LiveStandings({
  groupId,
  gameId,
  currentUserId,
}: {
  groupId: number
  gameId: number
  currentUserId?: number
}) {
  const q = useProvisionalLeaderboard(groupId, gameId)
  if (!q.data?.live) return null
  const entries = q.data.entries

  return (
    <Card className="overflow-hidden border-loss/25">
      <div className="flex items-center gap-2 border-b border-loss/15 px-4 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
        </span>
        <h3 className="section-label text-sm text-loss">Canlı Sıralama</h3>
        <span className="ml-auto text-[11px] text-ink-500">maçlar bitince kesinleşir</span>
      </div>
      <ul className="divide-y divide-ink-850">
        {entries.map((e, i) => (
          <li
            key={e.userId}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5',
              e.userId === currentUserId ? 'bg-brand-500/10' : i === 0 && 'bg-amber-400/[0.06]',
            )}
          >
            <span
              className={cn(
                'score-num w-5 text-center text-sm font-bold tabular-nums',
                i === 0 ? 'text-amber-300' : 'text-ink-400',
              )}
            >
              {i + 1}
            </span>
            {e.direction > 0 ? (
              <ArrowUp className="h-3.5 w-3.5 text-brand-400" />
            ) : e.direction < 0 ? (
              <ArrowDown className="h-3.5 w-3.5 text-loss" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-ink-600" />
            )}
            <MemberAvatar name={e.displayName} avatar={e.avatar} size={30} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-100">
              {e.displayName}
            </span>
            {e.livePoints > 0 && (
              <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-xs font-bold text-brand-300">
                +{e.livePoints}
              </span>
            )}
            <span
              className={cn(
                'score-num text-lg font-extrabold tabular-nums',
                i === 0 ? 'text-amber-300' : 'text-brand-400',
              )}
            >
              {e.points}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
