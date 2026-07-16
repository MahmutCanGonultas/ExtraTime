import { MemberAvatar } from '@/components/MemberAvatar'
import { cn } from '@/lib/cn'
import type { LeaderboardEntry } from './types'

const MEDAL: Record<number, string> = {
  1: 'bg-amber-400/20 text-amber-300',
  2: 'bg-slate-300/15 text-slate-200',
  3: 'bg-orange-400/15 text-orange-300',
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
        MEDAL[rank] ?? 'text-ink-500',
      )}
    >
      {rank}
    </span>
  )
}

// An engaging ranked list: coloured medal ranks, member avatars, big points and a
// highlighted "you" row. `offset` lets it continue below a podium (start at 4th).
export function Leaderboard({
  entries,
  currentUserId,
  offset = 0,
}: {
  entries: LeaderboardEntry[]
  currentUserId?: number
  offset?: number
}) {
  if (entries.length === 0) return null
  return (
    <ul className="divide-y divide-ink-850">
      {entries.map((e, i) => {
        const rank = offset + i + 1
        const isMe = e.userId === currentUserId
        return (
          <li
            key={e.userId}
            className={cn('flex items-center gap-3 px-3 py-2.5', isMe && 'bg-brand-500/[0.07]')}
          >
            <RankBadge rank={rank} />
            <MemberAvatar name={e.displayName} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink-100">
                {e.displayName}
                {isMe && <span className="ml-1 text-xs text-brand-300">(sen)</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-500">
                <span>{e.exactCount} tam</span>
                {e.accuracy != null && <span>· %{Math.round(e.accuracy * 100)} isabet</span>}
                {e.adjustment !== 0 && (
                  <span className={e.adjustment > 0 ? 'text-brand-300' : 'text-loss'}>
                    · {e.adjustment > 0 ? '+' : ''}
                    {e.adjustment} düzeltme
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-lg font-extrabold tabular-nums text-ink-100">{e.points}</span>
              <span className="ml-1 text-[11px] text-ink-500">puan</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
