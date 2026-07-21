import 'dotenv/config'
import { apiFootballGetEnvelope } from './src/lib/api-football/client'
import { syncRecentMatchDetails } from './src/features/football/sync/jobs'
import { getPool } from './src/db/pool'
const TARGET_USED = 7480
getPool()?.on('error', (e: any) => console.log(`[pool] ${e?.message || e}`))
process.on('uncaughtException', (e: any) => console.log(`[uncaught] ${e?.message || e}`))
process.on('unhandledRejection', (e: any) => console.log(`[unhandled] ${e?.message || e}`))
let last = 0
async function used(): Promise<number> {
  try { const e = await apiFootballGetEnvelope<any>('status', {}); last = e?.response?.requests?.current ?? last; return last }
  catch { return last }
}
const ts = () => new Date().toISOString().slice(11, 19)
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])
async function main() {
  const start = await used()
  console.log(`[${ts()}] START used ${start}/7500 · target ${TARGET_USED}`)
  let batch = 0, timeouts = 0
  while (true) {
    const u = await used()
    if (u >= TARGET_USED) { console.log(`[${ts()}] target reached: used ${u}`); break }
    const r = await withTimeout(syncRecentMatchDetails(20), 300_000)
    if (r === null) { timeouts++; console.log(`[${ts()}] stuck (${timeouts}); used≈${u}`); if (timeouts >= 3) break; continue }
    timeouts = 0; batch++
    console.log(`[${ts()}] match-details #${batch}: ${r.records} enriched, +${r.requests} req · used≈${u}`)
    if ((r.requests ?? 0) === 0) { console.log(`[${ts()}] backlog drained`); break }
  }
  const end = await used()
  console.log(`[${ts()}] DONE used ${end}/7500 · this run ≈${end - start} · ${batch} batches`)
  await getPool()?.end().catch(() => {})
}
main().then(() => process.exit(0)).catch((e: any) => { console.log('FATAL', e?.message || e); process.exit(1) })
