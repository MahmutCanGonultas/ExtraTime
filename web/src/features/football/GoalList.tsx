import { TeamLogo } from '@/components/TeamLogo'
import { BallMark } from '@/components/Brand'
import { cn } from '@/lib/cn'
import type { FixtureGoal } from './types'

function goalTag(detail: string | null): string {
  if (detail === 'Penalty') return ' (P)'
  if (detail === 'Own Goal') return ' (k.k.)'
  return ''
}

// Who scored, when — and who assisted. Each row: the scoring team's crest, a minute
// chip, a goal mark, the scorer (bold) and the assist (muted). Compact enough for a
// live card, readable on the match page.
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
    <ul className={cn('space-y-1.5', className)}>
      {shown.map((g, i) => (
        <li key={i} className="flex items-center gap-2 text-[13px]">
          <TeamLogo apiId={g.teamApiId} size={16} className="shrink-0" />
          {g.minute != null && (
            <span className="shrink-0 rounded-md bg-ink-800 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-ink-200 ring-1 ring-ink-700">
              {g.minute}'
            </span>
          )}
          <BallMark size={13} className="shrink-0 text-emerald-400" />
          <span className="min-w-0 truncate">
            <span className="font-bold text-ink-100">
              {g.playerName}
              {goalTag(g.detail)}
            </span>
            {g.assistName && (
              <span className="text-ink-400">
                {' '}
                <span className="text-ink-600">·</span> <span className="text-ink-500">as.</span>{' '}
                {g.assistName}
              </span>
            )}
          </span>
        </li>
      ))}
      {hidden > 0 && <li className="pl-1 text-xs font-medium text-ink-500">+{hidden} gol</li>}
    </ul>
  )
}
