import { TeamLogo } from '@/components/TeamLogo'
import { cn } from '@/lib/cn'
import type { Fixture, MatchEvent, MatchStat } from './types'

// Detailed summary for a finished match: a home-vs-away statistics comparison
// and the full event feed (goals, cards, substitutions) in match order.

const STAT_ROWS: Array<{ key: string; label: string; percent?: boolean }> = [
  { key: 'Ball Possession', label: 'Topla oynama', percent: true },
  { key: 'expected_goals', label: 'xG (beklenen gol)' },
  { key: 'Total Shots', label: 'Toplam şut' },
  { key: 'Shots on Goal', label: 'İsabetli şut' },
  { key: 'Shots off Goal', label: 'İsabetsiz şut' },
  { key: 'Corner Kicks', label: 'Korner' },
  { key: 'Fouls', label: 'Faul' },
  { key: 'Offsides', label: 'Ofsayt' },
  { key: 'Yellow Cards', label: 'Sarı kart' },
  { key: 'Red Cards', label: 'Kırmızı kart' },
  { key: 'Goalkeeper Saves', label: 'Kurtarış' },
  { key: 'Total passes', label: 'Pas' },
  { key: 'Passes %', label: 'Pas isabeti', percent: true },
]

function toNum(v: string | null): number {
  if (v == null) return 0
  const n = parseFloat(String(v).replace('%', '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function StatsTable({ stats, home, away }: { stats: MatchStat[]; home: Fixture['home']; away: Fixture['away'] }) {
  const map = new Map<string, { home: string | null; away: string | null }>()
  for (const s of stats) {
    const e = map.get(s.type) ?? { home: null, away: null }
    if (s.teamApiId === home.apiFootballId) e.home = s.value
    else if (s.teamApiId === away.apiFootballId) e.away = s.value
    map.set(s.type, e)
  }

  const rows = STAT_ROWS.map((r) => ({ ...r, v: map.get(r.key) })).filter(
    (r) => r.v && (r.v.home != null || r.v.away != null),
  )
  if (rows.length === 0) return null

  return (
    <div className="space-y-3 px-4 py-3">
      {rows.map((r) => {
        const h = toNum(r.v!.home)
        const a = toNum(r.v!.away)
        const total = h + a
        const hPct = r.percent ? h : total > 0 ? (h / total) * 100 : 50
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-100">{r.v!.home ?? '—'}</span>
              <span className="text-ink-400">{r.label}</span>
              <span className="font-semibold text-ink-100">{r.v!.away ?? '—'}</span>
            </div>
            <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-ink-800">
              <div className="bg-brand-500" style={{ width: `${hPct}%` }} />
              <div className="bg-ink-600" style={{ width: `${100 - hPct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function eventIcon(e: MatchEvent): string {
  if (e.type === 'Goal') {
    if (e.detail === 'Own Goal') return '⚽'
    if (e.detail === 'Missed Penalty') return '❌'
    return '⚽'
  }
  if (e.type === 'Card') return e.detail === 'Red Card' ? '🟥' : '🟨'
  if (e.type === 'subst') return '🔁'
  if (e.type === 'Var') return '📺'
  return '•'
}

function EventTimeline({ events, home, away }: { events: MatchEvent[]; home: Fixture['home']; away: Fixture['away'] }) {
  const shown = events.filter((e) => ['Goal', 'Card', 'subst'].includes(e.type))
  if (shown.length === 0) return null

  return (
    <ul className="divide-y divide-ink-850">
      {shown.map((e, i) => {
        const isHome = e.teamApiId === home.apiFootballId
        const isGoal = e.type === 'Goal' && e.detail !== 'Missed Penalty'
        const min = e.minute != null ? `${e.minute}${e.extraMinute ? `+${e.extraMinute}` : ''}'` : ''
        const assist = e.type === 'Goal' ? e.assistName : null
        const tag =
          e.detail === 'Own Goal'
            ? 'kendi kalesine'
            : e.detail === 'Penalty'
              ? 'penaltı'
              : e.detail === 'Missed Penalty'
                ? 'kaçan penaltı'
                : e.type === 'subst' && e.assistName
                  ? `${e.assistName} çıktı`
                  : null
        return (
          <li
            key={i}
            className={cn(
              'flex items-center gap-2 px-4',
              // Goals carry visual weight (tinted row, more padding); cards/subs stay quiet.
              isGoal ? 'bg-brand-500/[0.07] py-2.5' : 'py-2',
              isHome ? '' : 'flex-row-reverse text-right',
            )}
          >
            <span className="w-9 shrink-0 text-xs tabular-nums text-ink-500">{min}</span>
            <span className={cn('shrink-0', isGoal ? 'text-lg' : 'text-sm')}>{eventIcon(e)}</span>
            <TeamLogo apiId={isHome ? home.apiFootballId : away.apiFootballId} size={isGoal ? 16 : 14} />
            <div className={cn('min-w-0 flex-1', isHome ? '' : 'text-right')}>
              <div
                className={cn(
                  isGoal ? 'text-[15px] font-bold text-ink-100' : 'text-sm text-ink-200',
                )}
              >
                {e.playerName ?? '—'}
                {tag && e.type !== 'subst' && (
                  <span className="ml-1 text-[11px] font-medium text-ink-500">· {tag}</span>
                )}
              </div>
              {/* Assist — its own line, brand-tinted so the provider stands out too. */}
              {assist && (
                <div
                  className={cn(
                    'mt-0.5 flex items-center gap-1 text-xs font-semibold text-brand-300',
                    !isHome && 'flex-row-reverse',
                  )}
                >
                  <span>👟</span>
                  <span className="truncate">asist · {assist}</span>
                </div>
              )}
              {e.type === 'subst' && tag && (
                <div className="mt-0.5 text-xs text-ink-500">{tag}</div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function MatchSummary({
  events,
  stats,
  home,
  away,
}: {
  events: MatchEvent[]
  stats: MatchStat[]
  home: Fixture['home']
  away: Fixture['away']
}) {
  const hasEvents = events.some((e) => ['Goal', 'Card', 'subst'].includes(e.type))
  const hasStats = stats.length > 0
  if (!hasEvents && !hasStats) return null

  return (
    <div className="space-y-4">
      {hasEvents && (
        <div className="overflow-hidden rounded-card border border-ink-800 bg-ink-900">
          <div className="section-label px-4 pt-3 text-ink-400">Maç özeti</div>
          <EventTimeline events={events} home={home} away={away} />
        </div>
      )}
      {hasStats && (
        <div className="overflow-hidden rounded-card border border-ink-800 bg-ink-900">
          <div className="section-label px-4 pt-3 text-ink-400">İstatistikler</div>
          <StatsTable stats={stats} home={home} away={away} />
        </div>
      )}
    </div>
  )
}
