import { useEffect, useState, type ReactNode } from 'react'
import { isSiteDown, markSiteDown, subscribeSiteStatus } from '@/lib/siteStatus'
import { SiteDown } from './SiteDown'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// Wraps the entire app. The moment the backend reports it is down (503) the whole
// screen becomes the offline page — on EVERY route, so no URL slips past it. Detected
// two ways: a real request failing (api.ts raises the signal) and a one-off probe on
// mount, so even a visitor who triggers no query still lands on the page.
export function SiteGate({ children }: { children: ReactNode }) {
  const [down, setDown] = useState(isSiteDown())

  useEffect(() => {
    const unsub = subscribeSiteStatus(() => setDown(true))
    fetch(BASE_URL + '/status')
      .then((res) => {
        if (res.status === 503) markSiteDown()
      })
      .catch(() => {
        // A network/CORS failure is ambiguous (flaky wifi vs. real outage), so don't
        // false-positive here — let actual requests decide via the 503 signal.
      })
    return unsub
  }, [])

  if (down) return <SiteDown />
  return <>{children}</>
}
