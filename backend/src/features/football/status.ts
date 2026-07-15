// API-Football exposes many short status codes. We collapse them into the few
// categories our app actually reacts to. Pure functions — unit tested.

export type FixtureCategory =
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'UNKNOWN'

const SCHEDULED = new Set(['TBD', 'NS'])
const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'])
const FINISHED = new Set(['FT', 'AET', 'PEN'])
const POSTPONED = new Set(['PST'])
const CANCELLED = new Set(['CANC', 'ABD', 'AWD', 'WO'])

export function categorizeStatus(short: string): FixtureCategory {
  if (SCHEDULED.has(short)) return 'SCHEDULED'
  if (LIVE.has(short)) return 'LIVE'
  if (FINISHED.has(short)) return 'FINISHED'
  if (POSTPONED.has(short)) return 'POSTPONED'
  if (CANCELLED.has(short)) return 'CANCELLED'
  return 'UNKNOWN'
}

/** Scoring/settle may run ONLY when the match is truly over with a final score. */
export function isFinal(short: string): boolean {
  return FINISHED.has(short)
}

/** Predictions may be entered only while a match is still scheduled. */
export function isScheduled(short: string): boolean {
  return SCHEDULED.has(short)
}
