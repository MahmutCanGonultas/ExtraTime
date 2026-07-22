import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useBracket,
  useLeagueFixtures,
  useLeagues,
  useStandings,
  useTopAssists,
  useTopScorers,
} from '@/features/football/hooks'
import { StandingsTable } from '@/features/football/StandingsTable'
import { Bracket } from '@/features/football/Bracket'
import { FixtureList } from '@/features/football/FixtureList'
import { isFinished } from '@/features/football/matchStatus'
import { AssistsTable, ScorersTable } from '@/features/football/PlayerTables'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'
import { leagueLogoUrl } from '@/lib/format'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

// Signature colour per competition — used to tint the header so it isn't a flat
// dark band. Falls back to cyan for anything unlisted.
const LEAGUE_ACCENT: Record<number, string> = {
  39: '#8b5cf6', // Premier League
  140: '#f97316', // La Liga
  78: '#ef4444', // Bundesliga
  135: '#3b82f6', // Serie A
  61: '#14b8a6', // Ligue 1
  203: '#f43f5e', // Süper Lig
  2: '#22d3ee', // Şampiyonlar Ligi
  3: '#fb923c', // Avrupa Ligi
  848: '#4ade80', // Konferans Ligi
  1: '#38bdf8', // Dünya Kupası
}
function wash(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export function LeagueDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const leagueId = Number(id)
  const [tab, setTab] = useState<string | null>(null)
  const { data: leagues } = useLeagues(false)
  const league = leagues?.find((l) => l.id === leagueId)

  // Every season we hold for this same competition, newest first — powers the
  // season switcher so any league (not just the featured six) can reach its past.
  const seasons = useMemo(() => {
    if (!league) return []
    return (leagues ?? [])
      .filter((l) => l.apiFootballId === league.apiFootballId)
      .sort((a, b) => b.season - a.season)
  }, [leagues, league])

  // The "Eleme" (knockout) tab only exists for tournaments that have a bracket.
  const bracket = useBracket(leagueId)
  const hasBracket = bracket.data?.hasKnockout ?? false

  const tabs = [
    ...(hasBracket ? [{ key: 'bracket', label: 'Eleme' }] : []),
    { key: 'standings', label: hasBracket ? 'Gruplar' : 'Puan Durumu' },
    { key: 'fixtures', label: 'Fikstür' },
    { key: 'scorers', label: 'Gol Krallığı' },
    { key: 'assists', label: 'Asist Krallığı' },
  ]
  // Until the visitor picks a tab, tournaments open on the bracket.
  const active = tab ?? (hasBracket ? 'bracket' : 'standings')
  const accent = (league && LEAGUE_ACCENT[league.apiFootballId]) || '#22d3ee'

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-card border border-ink-800 bg-ink-900 px-5 py-5">
        {league && (
          <>
            {/* league-coloured wash so the header reads as that competition */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(120% 150% at 0% 0%, ${wash(accent, 0.3)}, transparent 60%)`,
              }}
            />
            {/* giant faded crest bleeding off the right edge */}
            <img
              src={leagueLogoUrl(league.apiFootballId)}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 object-contain opacity-[0.09]"
            />
          </>
        )}
        <div className="relative flex flex-wrap items-center gap-4">
          {league && (
            <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-black/5">
              <TeamLogo apiId={league.apiFootballId} kind="league" size={46} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-100 sm:text-3xl">
              {league?.name ?? 'Lig'}
            </h1>
            {league && (
              <p className="mt-0.5 text-sm text-ink-400">
                {league.country} · {seasonLabel(league.season)} sezonu
              </p>
            )}
          </div>
          {seasons.length > 1 && (
            <label className="ml-auto flex items-center gap-2 text-sm text-ink-400">
              <span className="hidden sm:inline">Sezon</span>
              <select
                value={leagueId}
                onChange={(e) => navigate(`/leagues/${e.target.value}`)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm font-semibold text-ink-100 outline-none transition hover:border-ink-600 focus:border-brand-500"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {seasonLabel(s.season)}
                    {s.isCurrent ? ' • güncel' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      <Tabs items={tabs} active={active} onChange={setTab} />

      {active === 'bracket' ? (
        <Card className="p-3">
          {bracket.isLoading ? (
            <Loading />
          ) : bracket.data?.hasKnockout ? (
            <Bracket data={bracket.data} />
          ) : (
            <EmptyState title="Eleme aşaması henüz yok" />
          )}
        </Card>
      ) : (
        <Card className="p-1">
          {active === 'standings' && <StandingsTab leagueId={leagueId} />}
          {active === 'fixtures' && <FixturesTab leagueId={leagueId} />}
          {active === 'scorers' && <ScorersTab leagueId={leagueId} />}
          {active === 'assists' && <AssistsTab leagueId={leagueId} />}
        </Card>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  )
}

function StandingsTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useStandings(leagueId)
  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Puan durumu yok" />
  return <StandingsTable rows={data} />
}

function FixturesTab({ leagueId }: { leagueId: number }) {
  const [status, setStatus] = useState<'all' | 'upcoming' | 'finished'>('all')
  const [teamId, setTeamId] = useState<number | 'all'>('all')
  // Load the whole season once, then filter by status + team on the client so
  // the team dropdown always lists every team regardless of the status filter.
  const { data, isLoading, isError, refetch } = useLeagueFixtures(leagueId, 'all')

  const teams = useMemo(() => {
    const m = new Map<number, string>()
    for (const f of data ?? []) {
      m.set(f.home.id, f.home.name)
      m.set(f.away.id, f.away.name)
    }
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [data])

  const shown = (data ?? []).filter((f) => {
    if (teamId !== 'all' && f.home.id !== teamId && f.away.id !== teamId) return false
    if (status === 'finished') return isFinished(f.status)
    if (status === 'upcoming') return f.status === 'NS'
    return true
  })
  const ordered = status === 'finished' ? [...shown].reverse() : shown

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 p-3">
        {(['all', 'upcoming', 'finished'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-md px-3 py-2 text-xs font-medium transition ${
              status === f ? 'bg-ink-800 text-brand-300' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {f === 'all' ? 'Tümü' : f === 'upcoming' ? 'Yaklaşan' : 'Bitti'}
          </button>
        ))}
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="ml-auto rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-200 outline-none focus:border-brand-500"
        >
          <option value="all">Tüm takımlar</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !ordered.length ? (
        <EmptyState title="Maç bulunamadı" />
      ) : (
        <FixtureList fixtures={ordered} />
      )}
    </div>
  )
}

function ScorersTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useTopScorers(leagueId)
  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Gol krallığı verisi yok" />
  return <ScorersTable rows={data} />
}

function AssistsTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useTopAssists(leagueId)
  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Asist krallığı verisi yok" />
  return <AssistsTable rows={data} />
}
