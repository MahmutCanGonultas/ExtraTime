import { useState } from 'react'
import { useActiveGroup } from '@/features/groups/useActiveGroup'
import { PredictionsPage } from './PredictionsPage'
import { GroupPage } from './GroupPage'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/feedback'

// Predictions and group management are two views of the SAME group, so they live
// under one "Grup" section with tabs instead of two separate nav items: you
// predict on the Tahminler tab, and the leader manages games/members on the Grup
// tab. When there is no group yet, GroupPage shows the create/join flow.
export function GroupHubPage() {
  const { active, isLoading } = useActiveGroup()
  const [tab, setTab] = useState('play')

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
        onChange={setTab}
      />
      {tab === 'play' ? <PredictionsPage /> : <GroupPage />}
    </div>
  )
}
