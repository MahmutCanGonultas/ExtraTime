// A tiny shared store for the "active group" so a switch in the header updates
// every group-scoped view at once. Persisted to localStorage.
const KEY = 'extratime_active_group'
let current = Number(localStorage.getItem(KEY) || 0)
const listeners = new Set<() => void>()

export function getActiveGroupId(): number {
  return current
}

export function setActiveGroupId(id: number): void {
  current = id
  localStorage.setItem(KEY, String(id))
  listeners.forEach((l) => l())
}

export function subscribeActiveGroup(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
