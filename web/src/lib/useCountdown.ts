import { useEffect, useState } from 'react'

// Live countdown to a target time. Ticks every second and cleans up the timer
// on unmount. `locked` flips true once the target is reached.
export function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = new Date(targetIso).getTime() - now
  const locked = diff <= 0
  const totalSeconds = Math.max(0, Math.floor(diff / 1000))

  return {
    locked,
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function formatCountdown(c: {
  days: number
  hours: number
  minutes: number
  seconds: number
}): string {
  if (c.days > 0) return `${c.days}g ${c.hours}s`
  if (c.hours > 0) return `${c.hours}s ${c.minutes}dk`
  if (c.minutes > 0) return `${c.minutes}dk ${c.seconds}sn`
  return `${c.seconds}sn`
}
