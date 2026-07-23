// A tiny global signal the API client raises when the backend reports it is down
// (HTTP 503 — the maintenance kill switch). The app subscribes to swap in the
// full-screen offline page. Kept outside React so any request, from anywhere, can
// flip it without prop-drilling.
let down = false
const listeners = new Set<() => void>()

export function markSiteDown(): void {
  if (down) return
  down = true
  listeners.forEach((l) => l())
}

export function isSiteDown(): boolean {
  return down
}

export function subscribeSiteStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
