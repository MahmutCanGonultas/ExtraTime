import { useSearchParams } from 'react-router-dom'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { PredictionsPage } from './PredictionsPage'
import { StandingsPage } from './StandingsPage'
import { GroupPage } from './GroupPage'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/feedback'

// One "Grup" section, three focused tabs so no single screen is crowded:
//   Tahminler — just the matches you predict
//   Puanlar   — live standings, weekly champions and the full point history
//   Grup      — members, invite code, game management
// The active tab lives in the URL (?t=table / ?t=manage) so it's linkable. When
// there is no group yet, GroupPage shows the create/join flow.
export function GroupHubPage() {
  const { active, isLoading } = useActiveGroup()
  const [params, setParams] = useSearchParams()
  const t = params.get('t')
  const tab = t === 'manage' ? 'manage' : t === 'table' ? 'table' : 'play'

  if (isLoading) return <Skeleton className="h-64" />
  if (!active) return <GroupPage />

  return (
    <div className="space-y-4">
      <Tabs
        items={[
          { key: 'play', label: 'Tahminler' },
          { key: 'table', label: 'Puanlar' },
          { key: 'manage', label: 'Grup' },
        ]}
        active={tab}
        onChange={(key) => setParams(key === 'play' ? {} : { t: key }, { replace: true })}
      />
      {tab === 'play' ? <PredictionsPage /> : tab === 'table' ? <StandingsPage /> : <GroupPage />}
    </div>
  )
}
