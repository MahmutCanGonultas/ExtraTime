import type { MemberPrediction } from '@/features/groups/types'

// Post-lock "pulse": how the group's predictions split across 1X2, plus the most
// popular exact scores. Pure aggregation of picks the API already returns once a
// match has locked — shows crowd vs contrarian at a glance.
export function PredictionPulse({
  predictions,
  homeName,
  awayName,
}: {
  predictions: MemberPrediction[]
  homeName: string
  awayName: string
}) {
  const total = predictions.length
  if (total === 0) return null

  const home = predictions.filter((p) => p.predictedOutcome === 'HOME').length
  const draw = predictions.filter((p) => p.predictedOutcome === 'DRAW').length
  const away = predictions.filter((p) => p.predictedOutcome === 'AWAY').length
  const pct = (n: number) => Math.round((n / total) * 100)

  const scores = new Map<string, number>()
  for (const p of predictions) {
    if (p.predictedHome != null && p.predictedAway != null) {
      const k = `${p.predictedHome}-${p.predictedAway}`
      scores.set(k, (scores.get(k) ?? 0) + 1)
    }
  }
  const topScores = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div className="space-y-3 border-b border-ink-800 px-4 py-3">
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-ink-400">
          <span className="truncate">{homeName}</span>
          <span>Beraberlik</span>
          <span className="truncate">{awayName}</span>
        </div>
        <div className="flex h-6 overflow-hidden rounded-md text-[11px] font-bold text-ink-950">
          {home > 0 && (
            <span className="flex items-center justify-center bg-brand-500" style={{ width: `${pct(home)}%` }}>
              {pct(home)}%
            </span>
          )}
          {draw > 0 && (
            <span className="flex items-center justify-center bg-ink-500 text-ink-100" style={{ width: `${pct(draw)}%` }}>
              {pct(draw)}%
            </span>
          )}
          {away > 0 && (
            <span className="flex items-center justify-center bg-amber-400" style={{ width: `${pct(away)}%` }}>
              {pct(away)}%
            </span>
          )}
        </div>
      </div>

      {topScores.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-ink-500">En çok:</span>
          {topScores.map(([k, n]) => (
            <span key={k} className="rounded bg-ink-800 px-2 py-0.5 text-xs text-ink-200">
              <span className="score-num">{k}</span> <span className="text-ink-500">×{n}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
