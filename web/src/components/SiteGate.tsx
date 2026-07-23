import { useEffect, useState, type ReactNode } from 'react'
import { isSiteDown, markSiteDown, subscribeSiteStatus } from '@/lib/siteStatus'
import { SiteDown } from './SiteDown'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

type Status = 'checking' | 'up' | 'down'

// Neutral dark splash shown for the ~150ms probe. Deliberately content-free: it can
// resolve to EITHER the app or the offline page, so it must reveal neither — that's
// what stops the login screen from flashing behind the "server error" page.
function Booting() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-brand-400" />
    </div>
  )
}

// Wraps the entire app. Nothing of the app renders until a mount-time probe of
// /status confirms the backend is up — so on a paused site the user goes splash →
// full-screen "server error" with no flash of the login/app underneath. On any 503
// (this probe, or a later real request via api.ts) it switches to the offline page
// on EVERY route. A network error is treated as "up" — ambiguous, so let the app
// load and let real requests decide rather than false-crashing on flaky wifi.
export function SiteGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(isSiteDown() ? 'down' : 'checking')

  useEffect(() => {
    const unsub = subscribeSiteStatus(() => setStatus('down'))
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)

    fetch(BASE_URL + '/status', { signal: ctrl.signal })
      .then((res) => {
        if (res.status === 503) {
          markSiteDown()
          setStatus('down')
        } else {
          setStatus('up')
        }
      })
      .catch(() => setStatus('up'))
      .finally(() => clearTimeout(timer))

    return () => {
      unsub()
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [])

  if (status === 'down') return <SiteDown />
  if (status === 'checking') return <Booting />
  return <>{children}</>
}
