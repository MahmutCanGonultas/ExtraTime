import { useState } from 'react'
import { Trophy, ChevronDown, Crown } from 'lucide-react'
import type { GameWeek } from './types'
import { Card, CardBody } from '@/components/ui/Card'
import { MemberAvatar } from '@/components/MemberAvatar'
import { cn } from '@/lib/cn'

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

// Each week is an Istanbul calendar week (Mon–Sun). roundKey is that week's Monday
// date — show it as "N. Hafta · 13 Tem–19 Tem".
function weekTitle(week: GameWeek): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(week.roundKey)
  if (m) {
    const mon = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const fmt = (d: Date) => `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`
    return `${week.weekNo}. Hafta · ${fmt(mon)}–${fmt(sun)}`
  }
  return week.weekNo != null ? `${week.weekNo}. Hafta` : week.roundKey
}

// Round-by-round breakdown of a game, aligned to the league gameweeks (Süper Lig
// "2. Hafta"). Each round crowns its own champion once its matches are done; the
// OVERALL champion (shown in the leaderboard) is the sum of every round.
export function WeeklyChampions({
  weeks,
  overallLeader,
  currentUserId,
}: {
  weeks: GameWeek[]
  overallLeader?: { displayName: string; points: number } | null
  currentUserId?: number
}) {
  const [open, setOpen] = useState<number | null>(null)
  if (!weeks.length) return null

  return (
    <Card className="overflow-hidden border-violet-500/25">
      <div className="flex items-center gap-2 border-b border-violet-500/15 bg-violet-500/[0.07] px-4 py-3">
        <Trophy className="h-4 w-4 text-violet-300" />
        <h3 className="section-label text-sm text-violet-200">Haftalık Şampiyonlar</h3>
      </div>
      <CardBody className="space-y-2">
        {overallLeader && (
          <div className="mb-1 flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2">
            <Crown className="h-4 w-4 shrink-0 text-brand-300" />
            <span className="text-sm text-ink-200">
              Genel lider: <span className="font-semibold text-ink-100">{overallLeader.displayName}</span>
              {' · '}
              <span className="text-brand-300">{overallLeader.points} puan</span>
            </span>
            <span className="ml-auto text-[11px] text-ink-500">tüm haftaların toplamı</span>
          </div>
        )}

        {weeks.map((w, i) => {
          const isOpen = open === i
          const leader = w.standings[0]
          return (
            <div key={w.roundKey} className="rounded-lg bg-ink-850">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                <span className="section-label shrink-0 text-[11px] text-brand-300">{weekTitle(w)}</span>
                <span className="ml-1 min-w-0 flex-1 truncate">
                  {w.champion ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
                      <span className="font-semibold text-ink-100">{w.champion.displayName}</span>
                      <span className="text-brand-300">· {w.champion.points} puan</span>
                    </span>
                  ) : leader && leader.points > 0 ? (
                    <span className="text-sm text-ink-400">
                      lider {leader.displayName} · <span className="text-ink-300">devam ediyor</span>
                    </span>
                  ) : (
                    <span className="text-sm text-ink-500">
                      {w.settled ? 'sonuç yok' : `${w.matchCount} maç · başlamadı`}
                    </span>
                  )}
                </span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-500 transition', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <ul className="space-y-1 border-t border-ink-800 px-3 py-2">
                  {w.standings.map((s, idx) => (
                    <li
                      key={s.userId}
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        s.userId === currentUserId && 'font-semibold text-brand-300',
                      )}
                    >
                      <span
                        className={cn(
                          'w-4 shrink-0 text-xs font-bold tabular-nums',
                          idx === 0 ? 'text-amber-300' : 'text-ink-500',
                        )}
                      >
                        {idx + 1}
                      </span>
                      <MemberAvatar name={s.displayName} avatar={s.avatar} size={28} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink-100">
                        {s.displayName}
                      </span>
                      <span
                        className={cn(
                          'score-num shrink-0 font-bold tabular-nums',
                          idx === 0 ? 'text-amber-300' : 'text-brand-400',
                        )}
                      >
                        {s.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}
