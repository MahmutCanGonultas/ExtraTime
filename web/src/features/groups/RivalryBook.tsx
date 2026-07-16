import { Swords, Flame } from 'lucide-react'
import { useRivalries } from './hooks'
import type { Rivalry } from './types'
import { MemberAvatar } from '@/components/MemberAvatar'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/feedback'

// Head-to-head record of "you" vs every other member across all the group's games.
export function RivalryBook({ groupId }: { groupId: number }) {
  const rivals = useRivalries(groupId)
  const list = (rivals.data ?? []).filter((r) => r.games > 0)
  // Nemesis: the rival you trail by the most (and have real history with).
  const nemesis = list.reduce<Rivalry | null>(
    (worst, r) => (r.losses - r.wins > (worst ? worst.losses - worst.wins : 0) ? r : worst),
    null,
  )

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-brand-400" /> Rekabet Defteri
          </span>
        }
      />
      {rivals.isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : list.length === 0 ? (
        <CardBody className="py-6 text-center text-sm text-ink-500">
          Ortak sonuçlanmış maç oldukça senle diğerlerinin karnesi burada çıkacak.
        </CardBody>
      ) : (
        <ul className="divide-y divide-ink-850">
          {list.map((r) => (
            <li key={r.userId} className="flex items-center gap-3 px-4 py-2.5">
              <MemberAvatar name={r.displayName} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
                  <span className="truncate">{r.displayName}</span>
                  {nemesis?.userId === r.userId && (
                    <span className="flex items-center gap-0.5 rounded bg-loss/15 px-1.5 py-0.5 text-[10px] font-bold text-loss">
                      <Flame className="h-3 w-3" /> baş belan
                    </span>
                  )}
                </div>
                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <span className="bg-brand-500" style={{ width: `${(r.wins / r.games) * 100}%` }} />
                  <span className="bg-ink-600" style={{ width: `${(r.draws / r.games) * 100}%` }} />
                  <span className="bg-loss" style={{ width: `${(r.losses / r.games) * 100}%` }} />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="score-num text-base text-brand-300">{r.wins}</span>
                <span className="mx-0.5 text-ink-600">-</span>
                <span className="score-num text-base text-ink-400">{r.draws}</span>
                <span className="mx-0.5 text-ink-600">-</span>
                <span className="score-num text-base text-loss">{r.losses}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
