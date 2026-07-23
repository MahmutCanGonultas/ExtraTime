import { Router, type Request, type Response } from 'express'
import { query } from '../../db/pool'

// A tiny, secret-gated control page the owner bookmarks to flip the site's
// maintenance switch straight from a browser — no dashboard, no SQL. It is mounted
// BEFORE the maintenance guard, so it keeps working even while the whole site is
// "down". The secret lives in app_flags ('ops_key'); a wrong/missing key gets a flat
// 403 so the page's existence never leaks. Mutations are POST (+ Post/Redirect/Get),
// so a bookmark/prefetch of the read-only status URL can never toggle anything.
export const opsRouter = Router()

async function getFlag(key: string): Promise<string | undefined> {
  try {
    const { rows } = await query<{ value: string }>(`SELECT value FROM app_flags WHERE key = $1`, [
      key,
    ])
    return rows[0]?.value
  } catch {
    return undefined
  }
}

async function setMaintenance(value: 'on' | 'off'): Promise<void> {
  await query(
    `INSERT INTO app_flags (key, value) VALUES ('maintenance', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [value],
  )
}

function page(down: boolean, key: string): string {
  const state = down
    ? '<div class="state down">Site şu an: KAPALI 🔴</div><div class="sub">Ziyaretçiler "sunucu hatası" sayfasını görüyor.</div>'
    : '<div class="state up">Site şu an: AÇIK 🟢</div><div class="sub">Her şey normal çalışıyor.</div>'
  const k = encodeURIComponent(key)
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ExtraTime · Kontrol</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f14;
    color:#e5e9f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px}
  .card{width:min(92vw,420px);background:#121821;border:1px solid #1f2937;
    border-radius:20px;padding:28px;text-align:center}
  .brand{font-size:12px;color:#8b97a7;letter-spacing:.12em;font-weight:700}
  .state{font-size:22px;font-weight:800;margin:14px 0 4px}
  .up{color:#34d399}.down{color:#f87171}
  .sub{color:#8b97a7;font-size:13px;margin-bottom:24px;line-height:1.5}
  button{width:100%;border:0;border-radius:14px;padding:15px;font-size:15px;
    font-weight:800;cursor:pointer;margin-top:10px;transition:filter .15s}
  button:hover{filter:brightness(1.08)}
  .open{background:#10b981;color:#04120c}
  .close{background:#1f2937;color:#e5e9f0;border:1px solid #334155}
  .hint{color:#5b6675;font-size:11px;margin-top:22px;line-height:1.5}
</style></head><body><div class="card">
  <div class="brand">EXTRATIME · KONTROL</div>
  ${state}
  <form method="POST" action="/api/v1/ops/site?key=${k}&mode=off"><button class="open">Siteyi Aç 🟢</button></form>
  <form method="POST" action="/api/v1/ops/site?key=${k}&mode=on"><button class="close">Siteyi Kapat 🔴</button></form>
  <div class="hint">Bu linki gizli tut — bilen herkes siteyi açıp kapatabilir.</div>
</div></body></html>`
}

async function authorized(req: Request): Promise<string | null> {
  const provided = String(req.query.key ?? '')
  const expected = await getFlag('ops_key')
  return expected && provided === expected ? expected : null
}

// Read-only status + control panel.
opsRouter.get('/site', async (req: Request, res: Response) => {
  const key = await authorized(req)
  if (!key) {
    res.status(403).type('html').send('<h1>403 Forbidden</h1>')
    return
  }
  const down = (await getFlag('maintenance')) === 'on'
  res.type('html').send(page(down, key))
})

// Flip the switch, then redirect back to the panel (Post/Redirect/Get) so a refresh
// doesn't re-submit.
opsRouter.post('/site', async (req: Request, res: Response) => {
  const key = await authorized(req)
  if (!key) {
    res.status(403).type('html').send('<h1>403 Forbidden</h1>')
    return
  }
  const mode = req.query.mode
  if (mode === 'on' || mode === 'off') {
    await setMaintenance(mode)
  }
  res.redirect(303, `/api/v1/ops/site?key=${encodeURIComponent(key)}`)
})
