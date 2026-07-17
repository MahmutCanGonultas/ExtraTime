// localStorage that never throws. Some browser configs (private mode, "block
// all site data") make localStorage access raise SecurityError/QuotaExceeded;
// an unguarded call inside a render/effect would crash the whole React tree to
// a blank screen. These helpers degrade to null / no-op instead.
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — persistence is best-effort, so ignore */
  }
}
