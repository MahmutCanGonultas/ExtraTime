// Pure helper for the lock rule, used for tests and read-side checks. The
// AUTHORITATIVE lock lives in SQL (WHERE kickoff_at > now()) on the write path —
// see predictions.service. Both compare in UTC; the client clock is never trusted.

export function isLocked(kickoffAt: Date, now: Date): boolean {
  return now.getTime() >= kickoffAt.getTime()
}
