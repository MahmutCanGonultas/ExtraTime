import 'dotenv/config'
import { env } from '../config/env'
import { CURRENT_SEASON, HISTORY_SEASONS } from '../features/football/leagues.config'

// Diagnostic: prints your API-Football plan, daily request budget, and which of
// the configured seasons actually return data on your plan. Run after putting
// API_FOOTBALL_KEY in .env:  npm run check:api

async function call(path: string, params: Record<string, string | number> = {}) {
  const url = new URL(path, `${env.API_FOOTBALL_BASE_URL}/`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, { headers: { 'x-apisports-key': env.API_FOOTBALL_KEY as string } })
  return (await res.json()) as {
    errors?: unknown
    results?: number
    response?: unknown
  }
}

function hasErrors(errors: unknown): string | null {
  if (Array.isArray(errors) && errors.length) return JSON.stringify(errors)
  if (errors && typeof errors === 'object' && Object.keys(errors).length) return JSON.stringify(errors)
  return null
}

async function main() {
  if (!env.API_FOOTBALL_KEY) {
    console.error('API_FOOTBALL_KEY .env icinde tanimli degil. Once anahtarini oraya ekle.')
    process.exit(1)
  }

  const status = await call('status')
  const s = status.response as
    | { subscription?: { plan?: string; active?: boolean; end?: string }; requests?: { current?: number; limit_day?: number } }
    | undefined

  console.log('== Hesap Durumu ==')
  console.log(`Plan       : ${s?.subscription?.plan ?? '?'}`)
  console.log(`Aktif      : ${s?.subscription?.active ?? '?'}   Bitis: ${s?.subscription?.end ?? '?'}`)
  console.log(`Istek      : ${s?.requests?.current ?? '?'} / ${s?.requests?.limit_day ?? '?'} (gunluk)`)
  console.log('')

  // Probe fixture access per configured season, using Super Lig (id 203).
  console.log('== Sezon Erisimi (ornek: Super Lig, id=203) ==')
  for (const season of [CURRENT_SEASON, ...HISTORY_SEASONS]) {
    const res = await call('fixtures', { league: 203, season })
    const err = hasErrors(res.errors)
    console.log(`Sezon ${season}: ${err ? `ERISIM YOK -> ${err}` : `${res.results ?? 0} mac dondu`}`)
  }
  console.log('\nNot: "0 mac" veya hata gorursen o sezon planinda yok demektir.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
