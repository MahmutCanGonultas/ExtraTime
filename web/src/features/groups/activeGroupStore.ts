// A tiny shared store for the "active group" so a switch in the header updates
// every group-scoped view at once. Persisted to localStorage via the safe helpers
// — this module initialises at import time (before React mounts), so an unguarded
// localStorage access in a storage-blocked browser would blank the whole app.
import { safeGetItem, safeSetItem } from '@/lib/storage'

const KEY = 'extratime_active_group'
let current = Number(safeGetItem(KEY) || 0)
const listeners = new Set<() => void>()

export function getActiveGroupId(): number {
  return current
}

export function setActiveGroupId(id: number): void {
  current = id
  safeSetItem(KEY, String(id))
  listeners.forEach((l) => l())
}

export function subscribeActiveGroup(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
