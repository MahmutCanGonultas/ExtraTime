import { Trophy, Star, Target } from 'lucide-react'
import { useTrophies } from './hooks'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'

export function TrophyCabinet({ groupId, userId }: { groupId: number; userId: number }) {
  const t = useTrophies(groupId, userId)
  if (t.isLoading) return <Skeleton className="h-40" />
  const data = t.data
  if (!data) return null

  const tiles = [
    { icon: Trophy, label: 'Şampiyonluk', value: data.championships.length, tone: 'text-amber-300' },
    { icon: Star, label: 'Tutan joker', value: data.winningJokers, tone: 'text-brand-300' },
    { icon: Target, label: 'Tam skor', value: data.exactScores, tone: 'text-ink-100' },
  ]

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" /> Kupa Dolabı
          </span>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl bg-ink-850 py-3 text-center">
              <tile.icon className={`mx-auto h-5 w-5 ${tile.tone}`} />
              <div className={`score-num mt-1 text-2xl ${tile.tone}`}>{tile.value}</div>
              <div className="text-[11px] text-ink-400">{tile.label}</div>
            </div>
          ))}
        </div>

        {data.championships.length > 0 ? (
          <ul className="space-y-1">
            {data.championships.map((c, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
              >
                <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
                <span className="flex-1 truncate text-ink-100">{c.title} şampiyonu</span>
                {c.points != null && <span className="score-num text-amber-300">{c.points}</span>}
                {c.finishedAt && <span className="text-[11px] text-ink-500">{formatDate(c.finishedAt)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-xs text-ink-500">
            Henüz kupa yok — bir oyunu birinci bitir, dolap dolsun.
          </p>
        )}
      </CardBody>
    </Card>
  )
}
