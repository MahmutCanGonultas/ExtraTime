import { useSyncExternalStore } from 'react'
import { useMyGroups } from './hooks'
import { getActiveGroupId, setActiveGroupId, subscribeActiveGroup } from './activeGroupStore'

// Resolves the user's "current" group. With one group it's automatic; with
// several, the choice is remembered and shared across the whole app so a switch
// in the header updates every view at once.
export function useActiveGroup() {
  const { data: groups, isLoading } = useMyGroups()
  const selectedId = useSyncExternalStore(subscribeActiveGroup, getActiveGroupId)

  const active = groups?.find((g) => g.id === selectedId) ?? groups?.[0] ?? null

  return { groups: groups ?? [], active, isLoading, select: setActiveGroupId }
}
