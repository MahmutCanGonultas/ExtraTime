import { Crown } from 'lucide-react'
import { MemberAvatar } from '@/components/MemberAvatar'
import { cn } from '@/lib/cn'
import type { LeaderboardEntry } from './types'

interface Slot {
  entry: LeaderboardEntry
  rank: number
}

const MEDAL = {
  1: { ring: 'ring-amber-300', bar: 'bg-amber-400/20 text-amber-300', pedestal: 'h-20', avatar: 62 },
  2: { ring: 'ring-slate-300', bar: 'bg-slate-300/15 text-slate-200', pedestal: 'h-14', avatar: 52 },
  3: { ring: 'ring-orange-400', bar: 'bg-orange-400/15 text-orange-300', pedestal: 'h-10', avatar: 52 },
} as const

function Column({ slot, isMe }: { slot: Slot | undefined; isMe: boolean }) {
  if (!slot) return <div className="flex-1" />
  const m = MEDAL[slot.rank as 1 | 2 | 3]
  return (
    <div className="flex flex-1 flex-col items-center">
      {slot.rank === 1 && <Crown className="mb-1 h-5 w-5 text-amber-300" />}
      <MemberAvatar name={slot.entry.displayName} size={m.avatar} className={cn('ring-2', m.ring)} />
      <div className="mt-2 max-w-full truncate px-1 text-center text-sm font-semibold text-ink-100">
        {slot.entry.displayName}
        {isMe && <span className="ml-1 text-xs font-normal text-brand-300">(sen)</span>}
      </div>
      <div className="score-num text-2xl text-ink-100">{slot.entry.points}</div>
      <div
        className={cn(
          'score-num mt-1 flex w-full items-start justify-center rounded-t-lg pt-1.5 text-xl',
          m.bar,
          m.pedestal,
        )}
      >
        {slot.rank}
      </div>
    </div>
  )
}

// Visual top-3 podium: 2nd | 1st (crown, tallest) | 3rd.
export function Podium({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[]
  currentUserId?: number
}) {
  const top = entries.slice(0, 3).map((entry, i) => ({ entry, rank: i + 1 }))
  if (top.length === 0) return null
  const [first, second, third] = top
  const me = (s: Slot | undefined) => !!s && s.entry.userId === currentUserId
  return (
    <div className="flex items-end justify-center gap-2 px-2 pt-4 sm:gap-4">
      <Column slot={second} isMe={me(second)} />
      <Column slot={first} isMe={me(first)} />
      <Column slot={third} isMe={me(third)} />
    </div>
  )
}
