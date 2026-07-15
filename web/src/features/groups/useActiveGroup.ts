import { useState } from 'react'
import { useMyGroups } from './hooks'

const KEY = 'extratime_active_group'

// Resolves the user's "current" group. With one group it's automatic; with
// several, the choice is remembered in localStorage.
export function useActiveGroup() {
  const { data: groups, isLoading } = useMyGroups()
  const [selectedId, setSelectedId] = useState<number>(() => Number(localStorage.getItem(KEY) || 0))

  const active = groups?.find((g) => g.id === selectedId) ?? groups?.[0] ?? null

  function select(id: number) {
    setSelectedId(id)
    localStorage.setItem(KEY, String(id))
  }

  return { groups: groups ?? [], active, isLoading, select }
}
