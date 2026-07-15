import { TeamLogo } from '@/components/TeamLogo'
import { BallMark } from '@/components/Brand'
import type { FixtureGoal } from './types'

function goalTag(detail: string | null): string {
  if (detail === 'Penalty') return ' (P)'
  if (detail === 'Own Goal') return ' (k.k.)'
  return ''
}

// Who scored, when. Each row shows the scoring team's crest, the minute and the
// player — compact enough for a live card, readable on the match page.
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
    <ul className={className}>
      {shown.map((g, i) => (
        <li key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-ink-300">
          <TeamLogo apiId={g.teamApiId} size={14} />
          <BallMark size={10} className="text-ink-500" />
          {g.minute != null && <span className="tabular-nums text-ink-500">{g.minute}'</span>}
          <span className="truncate text-ink-200">
            {g.playerName}
            {goalTag(g.detail)}
          </span>
        </li>
      ))}
      {hidden > 0 && <li className="py-0.5 text-xs text-ink-500">+{hidden} gol</li>}
    </ul>
  )
}
