import { safeGetItem, safeSetItem } from './storage'

// Two themes the user can switch anytime: a light "aydınlık & ferah" default and a
// dark "modern" one. The choice is a data-theme attribute on <html>; index.css
// overrides the colour tokens under [data-theme="light"], flipping the whole app.
export type Theme = 'light' | 'dark'
const KEY = 'extratime:theme'

export function getTheme(): Theme {
  // Default to the refined dark theme; light is opt-in via the toggle.
  return safeGetItem(KEY) === 'light' ? 'light' : 'dark'
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
}

export function setTheme(t: Theme): void {
  safeSetItem(KEY, t)
  applyTheme(t)
}

// Call before React renders so there's no flash of the wrong theme.
export function initTheme(): void {
  applyTheme(getTheme())
}
