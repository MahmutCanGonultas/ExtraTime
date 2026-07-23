import { Users, Shield, Trophy, Gamepad2, Target, CalendarDays, UserPlus, Zap } from 'lucide-react'
import { useAdminStats } from './hooks'
import { Skeleton, ErrorState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

const NUM = new Intl.NumberFormat('tr-TR')

export function AdminOverview() {
  const { data, isLoading, isError, refetch } = useAdminStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const tiles = [
    { icon: Users, label: 'Kullanıcı', value: data.users, tone: 'text-brand-300', chip: 'bg-brand-500/15 text-brand-300', glow: 'rgba(16,185,129,0.15)' },
    { icon: Shield, label: 'Yönetici', value: data.admins, tone: 'text-amber-300', chip: 'bg-amber-500/15 text-amber-300', glow: 'rgba(245,158,11,0.15)' },
    { icon: UserPlus, label: 'Son 7 gün', value: data.newUsers7d, tone: 'text-sky-300', chip: 'bg-sky-500/15 text-sky-300', glow: 'rgba(56,189,248,0.15)' },
    { icon: Trophy, label: 'Grup', value: data.groups, tone: 'text-violet-300', chip: 'bg-violet-500/15 text-violet-300', glow: 'rgba(139,92,246,0.15)' },
    { icon: Gamepad2, label: 'Oyun (aktif)', value: `${NUM.format(data.activeGames)}/${NUM.format(data.games)}`, tone: 'text-cyan-200', chip: 'bg-cyan-500/15 text-cyan-200', glow: 'rgba(34,211,238,0.15)' },
    { icon: Target, label: 'Tahmin', value: data.predictions, tone: 'text-emerald-200', chip: 'bg-emerald-500/15 text-emerald-200', glow: 'rgba(16,185,129,0.12)' },
    { icon: CalendarDays, label: 'Fikstür', value: data.fixtures, tone: 'text-ink-100', chip: 'bg-white/10 text-ink-200', glow: 'rgba(255,255,255,0.06)' },
    { icon: Zap, label: 'Bugünkü API', value: data.apiRequestsToday, tone: 'text-rose-300', chip: 'bg-rose-500/15 text-rose-300', glow: 'rgba(244,63,94,0.15)' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="relative overflow-hidden rounded-2xl border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-950 p-4 shadow-sm transition hover:-translate-y-px hover:border-ink-700"
            style={{ boxShadow: `0 10px 30px -18px ${t.glow}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t.label}</span>
              <span className={cn('grid h-8 w-8 place-items-center rounded-lg', t.chip)}>
                <t.icon className="h-4 w-4" />
              </span>
            </div>
            <div className={cn('mt-2 font-display text-3xl font-black tabular-nums', t.tone)}>
              {typeof t.value === 'number' ? NUM.format(t.value) : t.value}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-500">
        Oyuncu havuzu: {NUM.format(data.players)} oyuncu · {NUM.format(data.leagues)} lig-sezon.
      </p>
    </div>
  )
}
