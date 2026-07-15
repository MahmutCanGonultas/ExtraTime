import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { newDb } from 'pg-mem'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Server } from 'node:http'

// Boots the real app against an in-memory Postgres and drives the HTTP API.

let base = ''
let server: Server | undefined

interface ApiOptions {
  token?: string
  body?: unknown
  sync?: boolean
}

async function api(method: string, path: string, opts: ApiOptions = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.sync ? { 'x-sync-secret': process.env.SYNC_SECRET as string } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* some responses have no body */
  }
  return { status: res.status, json }
}

beforeAll(async () => {
  process.env.NODE_ENV = 'development'
  process.env.JWT_SECRET = 'test-secret-at-least-16-characters'
  process.env.SYNC_SECRET = 'testsync'
  process.env.LOG_LEVEL = 'silent'

  const { setPoolForTesting } = await import('../db/pool')
  const { createApp } = await import('../app')

  const db = newDb()
  const migDir = join(process.cwd(), 'src/db/migrations')
  for (const file of readdirSync(migDir).filter((n) => n.endsWith('.sql')).sort()) {
    db.public.none(readFileSync(join(migDir, file), 'utf8'))
  }
  const { Pool } = db.adapters.createPg()
  const pool = new Pool()
  setPoolForTesting(pool)

  await pool.query(`INSERT INTO leagues (api_football_id, name, country, season) VALUES (203,'x','TR',2024)`)
  await pool.query(`INSERT INTO teams (api_football_id, name) VALUES (611,'A'),(645,'B')`)
  await pool.query(
    `INSERT INTO fixtures (api_football_id, league_id, home_team_id, away_team_id, kickoff_at, status)
     VALUES (900,1,1,2,'2030-01-01T18:00:00Z','NS')`,
  )

  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const address = server!.address()
  const port = typeof address === 'object' && address ? address.port : 0
  base = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server?.close()
})

describe('API integration (in-memory Postgres)', () => {
  it('runs the full loop: register, predict, lock, settle, leaderboard', async () => {
    const reg = await api('POST', '/api/v1/auth/register', {
      body: { email: 'ada@example.com', password: 'password123', displayName: 'Ada' },
    })
    expect(reg.status).toBe(201)
    const token = reg.json.token as string
    const userId = reg.json.user.id as number

    const group = await api('POST', '/api/v1/groups', { token, body: { name: 'Kanka Ligi' } })
    const groupId = group.json.group.id as number

    const pred = await api('PUT', `/api/v1/groups/${groupId}/predictions/1`, {
      token,
      body: { predictedHome: 2, predictedAway: 1 },
    })
    expect(pred.status).toBe(200)

    const sim = await api('POST', '/api/v1/admin/dev/simulate-result', {
      sync: true,
      body: { fixtureId: 1, homeScore: 2, awayScore: 1 },
    })
    expect(sim.json.settled).toBe(1)

    const locked = await api('PUT', `/api/v1/groups/${groupId}/predictions/1`, {
      token,
      body: { predictedHome: 0, predictedAway: 0 },
    })
    expect(locked.status).toBe(409)
    expect(locked.json.error.code).toBe('PREDICTION_LOCKED')

    const lb = await api('GET', `/api/v1/groups/${groupId}/leaderboard`, { token })
    const mine = lb.json.leaderboard.find((e: { userId: number }) => e.userId === userId)
    expect(mine.points).toBe(3)
    expect(mine.exactCount).toBe(1)
  })

  it('rejects protected routes without a token', async () => {
    const res = await api('GET', '/api/v1/groups/1/leaderboard')
    expect(res.status).toBe(401)
  })

  it('health reports the database is connected', async () => {
    const res = await api('GET', '/health')
    expect(res.json).toEqual({ status: 'ok', db: true })
  })
})
