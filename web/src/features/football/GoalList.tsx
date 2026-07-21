import { TeamLogo } from '@/components/TeamLogo'
import { cn } from '@/lib/cn'
import type { FixtureGoal } from './types'

function goalTag(detail: string | null): string {
  if (detail === 'Penalty') return ' (P)'
  if (detail === 'Own Goal') return ' (k.k.)'
  return ''
}

// Who scored, when — and who assisted. A green minute pill signals the goal (no
// clutter, no odd icon); the scorer is bold, the assist a quiet second name.
export function GoalList({
  goals,
  className,
  max,
}: {
  goals: FixtureGoal[]
  className?: string
  max?: number
}) {
  if (goals.length === 0) return null
  const shown = max ? goals.slice(0, max) : goals
  const hidden = goals.length - shown.length

  return (
    <ul className={cn('space-y-1', className)}>
      {shown.map((g, i) => (
        <li key={i} className="flex items-center gap-2.5 text-sm">
          <span className="grid h-6 min-w-[38px] shrink-0 place-items-center rounded-md bg-emerald-500/15 px-1.5 text-xs font-black tabular-nums text-emerald-300 ring-1 ring-emerald-500/25">
            {g.minute != null ? `${g.minute}'` : 'GOL'}
          </span>
          <TeamLogo apiId={g.teamApiId} size={16} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-bold text-ink-50">
              {g.playerName}
              {goalTag(g.detail)}
            </span>
            {g.assistName && <span className="text-[13px] text-ink-500"> · {g.assistName}</span>}
          </span>
        </li>
      ))}
      {hidden > 0 && <li className="pl-1 text-xs font-medium text-ink-500">+{hidden} gol</li>}
    </ul>
  )
}
