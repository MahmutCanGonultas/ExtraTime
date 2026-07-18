import { useSearchParams } from 'react-router-dom'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { PredictionsPage } from './PredictionsPage'
import { GroupPage } from './GroupPage'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/feedback'

// Predictions and group management are two views of the SAME group, so they live
// under one "Grup" section with tabs instead of two separate nav items: you
// predict on the Tahminler tab, and the leader manages games/members on the Grup
// tab. The active tab lives in the URL (?t=manage) so it's linkable — e.g. the
// active-game card's "Tahminler" button can deep-link back to the play tab. When
// there is no group yet, GroupPage shows the create/join flow.
export function GroupHubPage() {
  const { active, isLoading } = useActiveGroup()
  const [params, setParams] = useSearchParams()
  const tab = params.get('t') === 'manage' ? 'manage' : 'play'

  if (isLoading) return <Skeleton className="h-64" />
  if (!active) return <GroupPage />

  return (
    <div className="space-y-4">
      <Tabs
        items={[
          { key: 'play', label: 'Tahminler' },
          { key: 'manage', label: 'Grup' },
        ]}
        active={tab}
        onChange={(key) => setParams(key === 'manage' ? { t: 'manage' } : {}, { replace: true })}
      />
      {tab === 'play' ? <PredictionsPage /> : <GroupPage />}
    </div>
  )
}
