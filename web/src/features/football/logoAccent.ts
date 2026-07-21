import { useEffect, useState } from 'react'
import { teamLogoUrl } from '@/lib/format'
import { safeGetItem, safeSetItem } from '@/lib/storage'

// Derives a team's accent colour straight from its crest: load the logo (the media
// host sends CORS headers, so the canvas isn't tainted), find the dominant vivid
// colour, and use it to theme the page. Falls back to a supplied colour for
// monochrome crests (black/white) where no vivid colour exists.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return [h, s, l]
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255]
}

// Clamp a colour into a range that reads well as a glow on the dark UI, keeping its
// hue (the identity) but flooring saturation/lightness so a very dark or pale crest
// colour still shows.
function normaliseForGlow(hex: string): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex))
  const s2 = Math.min(1, Math.max(s, 0.55))
  const l2 = Math.min(0.62, Math.max(l, 0.44))
  return rgbToHex(...hslToRgb(h, s2, l2))
}

// Pull the dominant vivid colour out of a loaded logo, or null if the crest is
// essentially monochrome (no colour clears the vividness bar).
function extractAccent(img: HTMLImageElement): string | null {
  const size = 42
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size) // throws if tainted
  const buckets = new Map<string, { r: number; g: number; b: number; n: number; score: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 128) continue
    const [, s, l] = rgbToHsl(r, g, b)
    if (l > 0.93 || l < 0.07) continue // skip near-white / near-black
    if (s < 0.18) continue // skip greys
    const score = s * s + 0.1 // weight vivid pixels
    const key = `${r >> 5}-${g >> 5}-${b >> 5}` // quantise to 8 levels/channel
    const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 }
    bk.r += r
    bk.g += g
    bk.b += b
    bk.n++
    bk.score += score
    buckets.set(key, bk)
  }
  let best: { r: number; g: number; b: number; n: number; score: number } | null = null
  for (const bk of buckets.values()) if (!best || bk.score > best.score) best = bk
  if (!best || best.n < 4) return null
  const hex = rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n)
  const [, s] = rgbToHsl(...hexToRgb(hex))
  if (s < 0.22) return null // dominant colour still too grey — let the fallback win
  return normaliseForGlow(hex)
}

const memCache = new Map<number, string>()
const CACHE_PREFIX = 'extratime:logoAccent:v1:'

// The accent for a team, derived from its logo, with `fallback` shown until (or
// unless) extraction succeeds. Cached in-memory + localStorage so it's instant on
// repeat views.
export function useLogoAccent(apiId: number | null | undefined, fallback: string): string {
  const [color, setColor] = useState<string>(() => {
    if (apiId == null) return fallback
    const mem = memCache.get(apiId)
    if (mem) return mem
    const stored = safeGetItem(CACHE_PREFIX + apiId)
    if (stored) {
      memCache.set(apiId, stored)
      return stored
    }
    return fallback
  })

  useEffect(() => {
    if (apiId == null) {
      setColor(fallback)
      return
    }
    const cached = memCache.get(apiId) ?? safeGetItem(CACHE_PREFIX + apiId)
    if (cached) {
      memCache.set(apiId, cached)
      setColor(cached)
      return
    }
    // Show the curated fallback right away, then upgrade to the logo colour.
    setColor(fallback)
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = extractAccent(img)
        if (c) {
          memCache.set(apiId, c)
          safeSetItem(CACHE_PREFIX + apiId, c)
          if (!cancelled) setColor(c)
        }
      } catch {
        /* tainted canvas / decode failure — keep the fallback */
      }
    }
    img.src = teamLogoUrl(apiId)
    return () => {
      cancelled = true
    }
  }, [apiId, fallback])

  return color
}
