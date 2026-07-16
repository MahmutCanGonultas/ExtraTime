import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { TeamLogo } from '@/components/TeamLogo'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Bracket as BracketData, BracketMatch, BracketTeam } from './types'

// A knockout tree (World Cup, Champions League). Each round is a column; a match
// sits at the vertical midpoint of the previous-round ties its teams came from,
// and SVG elbows connect them — so the lines follow the real draw, not a guessed
// adjacent pairing.

const COL_W = 190 // horizontal pitch between columns
const CARD_W = 162
const CARD_H = 56
const SLOT = 74 // vertical pitch of one first-round slot
const TOP = 26 // headroom for the round label

function scoreLabel(m: BracketMatch, side: 'home' | 'away'): string {
  const s = side === 'home' ? m.homeScore : m.awayScore
  const p = side === 'home' ? m.penaltyHome : m.penaltyAway
  if (s == null) return ''
  return p == null ? String(s) : `${s} (${p})`
}

function TeamLine({
  team,
  score,
  win,
  decided,
}: {
  team: BracketTeam | null
  score: string
  win: boolean
  decided: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2',
        decided && !win && 'opacity-45',
        win && 'font-semibold',
      )}
      style={{ height: CARD_H / 2 }}
    >
      {win && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
      {team ? (
        <TeamLogo apiId={team.apiId} size={16} />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full bg-ink-700" />
      )}
      <span className={cn('min-w-0 flex-1 truncate text-[12px]', team ? 'text-ink-100' : 'text-ink-500')}>
        {team?.name ?? 'Belli değil'}
      </span>
      <span className="score-num shrink-0 text-[12px] text-ink-200">{score}</span>
    </div>
  )
}

function MatchCard({ m }: { m: BracketMatch }) {
  const decided = m.winner != null
  const inner = (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-ink-900',
        m.state === 'live' ? 'border-loss/50' : 'border-ink-800',
      )}
      style={{ width: CARD_W, height: CARD_H }}
    >
      <TeamLine team={m.home} score={scoreLabel(m, 'home')} win={m.winner === 'home'} decided={decided} />
      <div className="h-px bg-ink-800" />
      <TeamLine team={m.away} score={scoreLabel(m, 'away')} win={m.winner === 'away'} decided={decided} />
    </div>
  )
  return (
    <div className="group relative">
      <Link to={`/matches/${m.fixtureIds[0]}`} className="block transition group-hover:brightness-110">
        {inner}
      </Link>
      {(m.legs > 1 || m.state === 'scheduled') && (
        <div className="mt-0.5 flex items-center gap-1 px-2 text-[9px] uppercase tracking-wide text-ink-500">
          {m.legs > 1 && <span>çift maç</span>}
          {m.legs > 1 && m.state === 'scheduled' && <span>·</span>}
          {m.state === 'scheduled' && <span>{formatDate(m.kickoffAt)}</span>}
        </div>
      )}
    </div>
  )
}

export function Bracket({ data }: { data: BracketData }) {
  const rounds = data.rounds
  if (!rounds.length) return null

  // Vertical centre (in slot units) for every match, cascading left → right.
  const centre = new Map<string, number>()
  rounds.forEach((round) => {
    round.matches.forEach((m, i) => {
      const feeders = m.sourceKeys
        .map((k) => centre.get(k))
        .filter((v): v is number => v != null)
      centre.set(m.key, feeders.length ? feeders.reduce((a, b) => a + b, 0) / feeders.length : i)
    })
    // De-overlap within the column while keeping order.
    const ordered = [...round.matches].sort((a, b) => centre.get(a.key)! - centre.get(b.key)!)
    let last = -Infinity
    for (const m of ordered) {
      const c = Math.max(centre.get(m.key)!, last + 1)
      centre.set(m.key, c)
      last = c
    }
  })

  const maxCentre = Math.max(...centre.values())
  const hasChampCol = Boolean(data.champion) || rounds.some((r) => r.key === 'final')
  const contentW = rounds.length * COL_W + (hasChampCol ? COL_W : 0)
  const contentH = TOP + (maxCentre + 1) * SLOT

  const colX = (j: number) => j * COL_W
  const rowY = (key: string) => TOP + centre.get(key)! * SLOT

  // Connector elbows from each feeder's right edge to the match's left edge.
  const paths: string[] = []
  rounds.forEach((round, j) => {
    if (j === 0) return
    for (const m of round.matches) {
      const x2 = colX(j)
      const y2 = rowY(m.key) + CARD_H / 2
      for (const sk of m.sourceKeys) {
        if (!centre.has(sk)) continue
        const x1 = colX(j - 1) + CARD_W
        const y1 = rowY(sk) + CARD_H / 2
        const midX = x1 + (x2 - x1) / 2
        paths.push(`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`)
      }
    }
  })

  const finalRound = rounds.find((r) => r.key === 'final')
  const finalCentre = finalRound?.matches[0] ? centre.get(finalRound.matches[0].key)! : maxCentre / 2

  return (
    <div className="overflow-x-auto pb-3">
      <div className="relative" style={{ width: contentW, height: contentH, minWidth: contentW }}>
        {/* connectors behind the cards */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={contentW}
          height={contentH}
          fill="none"
        >
          {paths.map((d, i) => (
            <path key={i} d={d} className="stroke-ink-700" strokeWidth={1.5} />
          ))}
        </svg>

        {/* round headers */}
        {rounds.map((round, j) => (
          <div
            key={round.key}
            className="section-label absolute text-[10px] text-ink-400"
            style={{ left: colX(j), top: 0, width: CARD_W }}
          >
            {round.label}
          </div>
        ))}

        {/* matches */}
        {rounds.map((round, j) =>
          round.matches.map((m) => (
            <div key={m.key} className="absolute" style={{ left: colX(j), top: rowY(m.key), width: CARD_W }}>
              <MatchCard m={m} />
            </div>
          )),
        )}

        {/* champion */}
        {hasChampCol && (
          <div
            className="absolute"
            style={{ left: colX(rounds.length), top: TOP + finalCentre * SLOT, width: CARD_W }}
          >
            <div className="section-label mb-1 text-[10px] text-brand-300">Şampiyon</div>
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5',
                data.champion ? 'border-brand-500/40 bg-brand-500/10' : 'border-ink-800 bg-ink-900',
              )}
              style={{ height: CARD_H }}
            >
              <Trophy className={cn('h-5 w-5 shrink-0', data.champion ? 'text-brand-300' : 'text-ink-600')} />
              {data.champion ? (
                <>
                  <TeamLogo apiId={data.champion.apiId} size={20} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-100">
                    {data.champion.name}
                  </span>
                </>
              ) : (
                <span className="text-xs text-ink-500">Final oynanmadı</span>
              )}
            </div>
          </div>
        )}
      </div>

      {data.thirdPlace && <ThirdPlace m={data.thirdPlace} />}
    </div>
  )
}

function ThirdPlace({ m }: { m: BracketMatch }) {
  return (
    <div className="mt-4 max-w-sm">
      <div className="section-label mb-1 text-[10px] text-ink-400">Üçüncülük Maçı</div>
      <MatchCard m={m} />
    </div>
  )
}
