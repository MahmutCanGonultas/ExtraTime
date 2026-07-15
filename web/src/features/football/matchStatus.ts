// Shared helpers for interpreting a fixture status on the client (the same
// categories the backend uses).
export const FINAL_STATUSES = ['FT', 'AET', 'PEN']
export const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE']
export const CANCELLED_STATUSES = ['CANC', 'ABD', 'AWD', 'WO']

export function isFinished(status: string): boolean {
  return FINAL_STATUSES.includes(status)
}
export function isLive(status: string): boolean {
  return LIVE_STATUSES.includes(status)
}
export function isPostponed(status: string): boolean {
  return status === 'PST'
}
export function isCancelled(status: string): boolean {
  return CANCELLED_STATUSES.includes(status)
}
