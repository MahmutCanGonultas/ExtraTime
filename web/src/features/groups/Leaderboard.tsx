import { MemberAvatar } from '@/components/MemberAvatar'
import { cn } from '@/lib/cn'
import type { LeaderboardEntry } from './types'

// Gold / silver / bronze — a vivid badge, a matching avatar ring and a faint row
// tint for the top three, so the ranking reads at a glance instead of as a grey list.
const MEDAL: Record<number, { badge: string; ring: string; row: string }> = {
  1: {
    badge: 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 ring-amber-400/50',
    ring: 'ring-amber-400/60',
    row: 'bg-amber-400/[0.07]',
  },
  2: {
    badge: 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900 ring-slate-300/50',
    ring: 'ring-slate-300/50',
    row: 'bg-slate-400/[0.05]',
  },
  3: {
    badge: 'bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950 ring-orange-400/50',
    ring: 'ring-orange-400/50',
    row: 'bg-orange-400/[0.05]',
  },
}

function RankBadge({ rank }: { rank: number }) {
  const m = MEDAL[rank]
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs tabular-nums',
        m ? `font-black shadow-sm ring-2 ${m.badge}` : 'font-bold text-ink-400',
      )}
    >
      {rank}
    </span>
  )
}

// An engaging ranked list: vivid medal ranks, member avatars, bold names, big
// brand-coloured points and a highlighted "you" row. `offset` lets it continue
// below a podium (start at 4th).
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
        const medal = MEDAL[rank]
        return (
          <li
            key={e.userId}
            className={cn(
              'flex items-center gap-3 px-3 py-3',
              isMe ? 'bg-brand-500/10' : medal?.row,
            )}
          >
            <RankBadge rank={rank} />
            <MemberAvatar
              name={e.displayName}
              avatar={e.avatar}
              size={38}
              className={medal ? `ring-2 ${medal.ring}` : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-ink-100">
                {e.displayName}
                {isMe && <span className="ml-1 text-xs font-semibold text-brand-300">(sen)</span>}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-500">
                <span className="font-medium text-ink-400">{e.exactCount} tam</span>
                {e.accuracy != null && <span>· %{Math.round(e.accuracy * 100)} isabet</span>}
                {e.adjustment !== 0 && (
                  <span className={e.adjustment > 0 ? 'font-semibold text-brand-300' : 'font-semibold text-loss'}>
                    · {e.adjustment > 0 ? '+' : ''}
                    {e.adjustment} düzeltme
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  'score-num text-2xl font-extrabold tabular-nums',
                  rank === 1 ? 'text-amber-300' : 'text-brand-400',
                )}
              >
                {e.points}
              </span>
              <span className="ml-1 text-[11px] font-medium text-ink-500">puan</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
