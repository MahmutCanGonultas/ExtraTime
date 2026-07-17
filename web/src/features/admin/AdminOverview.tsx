import { Users, Shield, Trophy, Gamepad2, Target, CalendarDays, UserPlus, Zap } from 'lucide-react'
import { useAdminStats } from './hooks'
import { Card } from '@/components/ui/Card'
import { Skeleton, ErrorState } from '@/components/ui/feedback'

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
    { icon: Users, label: 'Kullanıcı', value: data.users, tone: 'text-brand-300' },
    { icon: Shield, label: 'Yönetici', value: data.admins, tone: 'text-amber-300' },
    { icon: UserPlus, label: 'Son 7 gün', value: data.newUsers7d, tone: 'text-sky-300' },
    { icon: Trophy, label: 'Grup', value: data.groups, tone: 'text-brand-300' },
    { icon: Gamepad2, label: 'Oyun (aktif)', value: `${NUM.format(data.activeGames)}/${NUM.format(data.games)}`, tone: 'text-ink-100' },
    { icon: Target, label: 'Tahmin', value: data.predictions, tone: 'text-ink-100' },
    { icon: CalendarDays, label: 'Fikstür', value: data.fixtures, tone: 'text-ink-100' },
    { icon: Zap, label: 'Bugünkü API', value: data.apiRequestsToday, tone: 'text-loss' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-center gap-2 text-ink-400">
              <t.icon className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">{t.label}</span>
            </div>
            <div className={`mt-2 text-2xl font-black tabular-nums ${t.tone}`}>
              {typeof t.value === 'number' ? NUM.format(t.value) : t.value}
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink-500">
        Oyuncu havuzu: {NUM.format(data.players)} oyuncu · {NUM.format(data.leagues)} lig-sezon.
      </p>
    </div>
  )
}
