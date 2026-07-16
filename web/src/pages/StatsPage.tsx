import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { useGroupStats, useLeaderboard } from '@/features/groups/hooks'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Skeleton, EmptyState, ErrorState } from '@/components/ui/feedback'

const COLORS = [
  '#34d399',
  '#60a5fa',
  '#f472b6',
  '#fbbf24',
  '#a78bfa',
  '#f87171',
  '#38bdf8',
  '#fb923c',
]

const tooltipStyle = {
  backgroundColor: '#222833',
  border: '1px solid #454f5d',
  borderRadius: 8,
  color: '#e6ebf0',
  fontSize: 12,
}

export function StatsPage() {
  const { active, isLoading } = useActiveGroup()
  const stats = useGroupStats(active?.id ?? 0)
  const leaderboard = useLeaderboard(active?.id ?? 0)

  if (isLoading) return <Skeleton className="h-64" />
  if (!active) {
    return <EmptyState title="Grup yok" description="İstatistikleri görmek için bir gruba katıl." />
  }

  const settled = stats.data ?? []
  const members = [...new Set(settled.map((s) => s.displayName))]

  // Cumulative points per member across settled matches (grouped by kickoff).
  const byMatch = new Map<string, typeof settled>()
  for (const s of settled) {
    const arr = byMatch.get(s.kickoffAt) ?? []
    arr.push(s)
    byMatch.set(s.kickoffAt, arr)
  }
  const running: Record<string, number> = {}
  members.forEach((m) => (running[m] = 0))
  const trend = [...byMatch.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, entries], i) => {
      entries.forEach((e) => (running[e.displayName] += e.points ?? 0))
      return { label: `${i + 1}`, ...Object.fromEntries(members.map((m) => [m, running[m]])) }
    })

  const accuracyData = (leaderboard.data ?? []).map((e) => ({
    name: e.displayName,
    isabet: e.accuracy != null ? Math.round(e.accuracy * 100) : 0,
  }))

  const hasData = settled.length > 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">İstatistik</h1>
        <p className="text-sm text-ink-400">{active.name}</p>
      </div>

      {stats.isError ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : stats.isLoading ? (
        <Skeleton className="h-72" />
      ) : !hasData ? (
        <EmptyState
          title="Henüz veri yok"
          description="Maçlar sonuçlanıp puanlar oluştukça grafikler burada belirecek."
        />
      ) : (
        <>
          <Card>
            <CardHeader title="Puan Trendi" />
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="#3b4451" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#8a95a3" fontSize={12} />
                    <YAxis stroke="#8a95a3" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {members.map((m, i) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="İsabet Oranları" />
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accuracyData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="#3b4451" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#8a95a3" fontSize={12} />
                    <YAxis stroke="#8a95a3" fontSize={12} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`%${v}`, 'İsabet']} />
                    <Bar dataKey="isabet" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
