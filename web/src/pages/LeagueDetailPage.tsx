import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useBracket,
  useLeagueFixtures,
  useLeaguePlayers,
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
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { Card } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

export function LeagueDetailPage() {
  const { id } = useParams()
  const leagueId = Number(id)
  const [tab, setTab] = useState<string | null>(null)
  const { data: leagues } = useLeagues(false)
  const league = leagues?.find((l) => l.id === leagueId)

  // The "Eleme" (knockout) tab only exists for tournaments that have a bracket.
  const bracket = useBracket(leagueId)
  const hasBracket = bracket.data?.hasKnockout ?? false
  // "Oyuncular" only where we hold player data for that season.
  const players = useLeaguePlayers(leagueId)
  const hasPlayers = (players.data?.length ?? 0) > 0

  const tabs = [
    ...(hasBracket ? [{ key: 'bracket', label: 'Eleme' }] : []),
    { key: 'standings', label: hasBracket ? 'Gruplar' : 'Puan Durumu' },
    { key: 'fixtures', label: 'Fikstür' },
    { key: 'scorers', label: 'Gol Krallığı' },
    { key: 'assists', label: 'Asist Krallığı' },
    ...(hasPlayers ? [{ key: 'players', label: 'Oyuncular' }] : []),
  ]
  // Until the visitor picks a tab, tournaments open on the bracket.
  const active = tab ?? (hasBracket ? 'bracket' : 'standings')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {league && <TeamLogo apiId={league.apiFootballId} kind="league" size={40} />}
        <div>
          <h1 className="text-2xl font-bold text-ink-100">{league?.name ?? 'Lig'}</h1>
          {league && (
            <p className="text-sm text-ink-400">
              {league.country} · {league.season} sezonu
            </p>
          )}
        </div>
      </div>

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
          {active === 'players' && <PlayersTab leagueId={leagueId} />}
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
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              status === f ? 'bg-ink-800 text-brand-300' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {f === 'all' ? 'Tümü' : f === 'upcoming' ? 'Yaklaşan' : 'Bitti'}
          </button>
        ))}
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="ml-auto rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200 outline-none focus:border-brand-500"
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

function PlayersTab({ leagueId }: { leagueId: number }) {
  const { data, isLoading, isError, refetch } = useLeaguePlayers(leagueId)
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr')
    const list = data ?? []
    return term
      ? list.filter(
          (p) =>
            p.name.toLocaleLowerCase('tr').includes(term) ||
            (p.teamName ?? '').toLocaleLowerCase('tr').includes(term),
        )
      : list
  }, [data, q])

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState title="Oyuncu verisi yok" />

  return (
    <div>
      <div className="p-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Oyuncu veya takım ara..."
          className="max-w-xs"
        />
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Oyuncu</Th>
            <Th className="hidden text-center sm:table-cell">Mevki</Th>
            <Th className="text-center">Maç</Th>
            <Th className="text-center">Gol</Th>
            <Th className="text-center">Asist</Th>
            <Th className="hidden text-center md:table-cell">Reyting</Th>
          </tr>
        </thead>
        <tbody>
          {shown.slice(0, 250).map((p) => (
            <Tr key={p.playerApiId}>
              <Td>
                <Link
                  to={`/players/${p.playerApiId}`}
                  className="flex items-center gap-2.5 hover:text-brand-300"
                >
                  <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-ink-100">{p.name}</div>
                    {p.teamName && (
                      <div className="flex items-center gap-1 truncate text-xs text-ink-400">
                        {p.teamApiId != null && <TeamLogo apiId={p.teamApiId} size={12} />}
                        {p.teamName}
                      </div>
                    )}
                  </div>
                </Link>
              </Td>
              <Td className="hidden text-center text-ink-400 sm:table-cell">{p.position ?? '—'}</Td>
              <Td className="text-center text-ink-300">{p.appearances ?? '—'}</Td>
              <Td className="text-center font-bold text-ink-100">{p.goals ?? 0}</Td>
              <Td className="text-center font-semibold text-ink-100">{p.assists ?? 0}</Td>
              <Td className="hidden text-center md:table-cell">
                {p.rating != null ? (
                  <span className="font-medium text-brand-300">{p.rating.toFixed(2)}</span>
                ) : (
                  '—'
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {shown.length > 250 && (
        <div className="p-3 text-center text-xs text-ink-500">
          İlk 250 oyuncu gösteriliyor — aramayı daraltın.
        </div>
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
