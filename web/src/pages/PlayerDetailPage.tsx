import { Link, useParams } from 'react-router-dom'
import { usePlayer } from '@/features/football/hooks'
import type { PlayerSeason, PlayerStatBlock } from '@/features/football/types'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { TeamLogo } from '@/components/TeamLogo'
import { PitchBackdrop } from '@/components/PitchBackdrop'
import { Card } from '@/components/ui/Card'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/feedback'

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${next.toString().padStart(2, '0')}`
}

export function PlayerDetailPage() {
  const { apiId } = useParams()
  const playerApiId = Number(apiId)
  const { data, isLoading, isError, refetch } = usePlayer(playerApiId)

  if (isLoading) return <Skeleton className="h-64" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return <EmptyState title="Oyuncu bulunamadı" />

  // Headline = the player's main competition (most appearances), not merely the
  // newest — so a club season outranks a short cup/national-team run.
  const primary = data.seasons.reduce(
    (best, s) => ((s.appearances ?? 0) > (best?.appearances ?? -1) ? s : best),
    data.seasons[0] as (typeof data.seasons)[number] | undefined,
  )
  const facts = [
    data.position && { label: 'Mevki', value: data.position },
    data.nationality && { label: 'Uyruk', value: data.nationality },
    data.age != null && { label: 'Yaş', value: String(data.age) },
    data.height && { label: 'Boy', value: data.height },
    data.weight && { label: 'Kilo', value: data.weight },
    data.birthPlace && { label: 'Doğum yeri', value: data.birthPlace },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const stats = primary
    ? [
        { label: 'Maç', value: primary.appearances ?? 0 },
        { label: 'Gol', value: primary.goals ?? 0, accent: true },
        { label: 'Asist', value: primary.assists ?? 0 },
        { label: 'Dakika', value: primary.minutes ?? 0 },
        { label: 'Reyting', value: primary.rating != null ? primary.rating.toFixed(2) : '—' },
      ]
    : []

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-card border border-ink-800"
        style={{ backgroundImage: 'linear-gradient(118deg, #18402f 0%, #1b2a22 48%, #222833 100%)' }}
      >
        <div className="absolute inset-0 mow-stripes" />
        <PitchBackdrop className="pointer-events-none absolute -right-10 top-0 hidden h-full w-2/3 text-brand-200/10 sm:block" />
        <div className="relative flex flex-wrap items-center gap-5 px-6 py-7 sm:px-8">
          <PlayerAvatar
            playerApiId={data.playerApiId}
            name={data.name}
            size={96}
            className="ring-2 ring-brand-500/40"
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-100">{data.name}</h1>
            {(data.firstname || data.lastname) && (
              <p className="text-sm text-ink-300">{[data.firstname, data.lastname].filter(Boolean).join(' ')}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {facts.map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-wide text-ink-500">{f.label}</div>
                  <div className="text-sm font-medium text-ink-100">{f.value}</div>
                </div>
              ))}
            </div>
            {data.currentTeamName && (
              <Link
                to={data.currentTeamId ? `/teams/${data.currentTeamId}` : '#'}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/40 px-2.5 py-1 text-xs font-medium text-ink-200 transition hover:text-brand-300"
              >
                {data.currentTeamApiId != null && <TeamLogo apiId={data.currentTeamApiId} size={16} />}
                {data.currentTeamName}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Headline stats (latest season) */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label}>
              <div className="px-3 py-4 text-center">
                <div className={`score-num text-3xl font-extrabold ${s.accent ? 'text-brand-300' : 'text-ink-100'}`}>
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-500">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed stat breakdown (main competition) */}
      {primary?.stats && <StatBreakdown s={primary.stats} />}

      {/* Season-by-season table */}
      <Card className="overflow-hidden">
        <div className="section-label px-4 pt-3 text-ink-400">
          Kariyer · sezon istatistikleri
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Sezon</Th>
              <Th>Takım</Th>
              <Th className="text-center">Maç</Th>
              <Th className="hidden text-center sm:table-cell">Dk</Th>
              <Th className="text-center">Gol</Th>
              <Th className="text-center">Asist</Th>
              <Th className="hidden text-center sm:table-cell">🟨</Th>
              <Th className="hidden text-center sm:table-cell">🟥</Th>
              <Th className="hidden text-center md:table-cell">Reyting</Th>
            </tr>
          </thead>
          <tbody>
            {data.seasons.map((s) => (
              <SeasonRow key={`${s.leagueId}-${s.season}`} s={s} />
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function SeasonRow({ s }: { s: PlayerSeason }) {
  return (
    <Tr>
      <Td className="whitespace-nowrap text-ink-300">
        <Link to={`/leagues/${s.leagueId}`} className="flex items-center gap-1.5 hover:text-brand-300">
          <TeamLogo apiId={s.leagueApiId} kind="league" size={16} />
          {seasonLabel(s.season)}
        </Link>
      </Td>
      <Td>
        <Link
          to={s.teamId ? `/teams/${s.teamId}` : '#'}
          className="flex items-center gap-2 hover:text-brand-300"
        >
          {s.teamApiId != null && <TeamLogo apiId={s.teamApiId} size={18} />}
          <span className="truncate text-ink-100">{s.teamName ?? '—'}</span>
        </Link>
      </Td>
      <Td className="text-center text-ink-300">{s.appearances ?? '—'}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.minutes ?? '—'}</Td>
      <Td className="text-center font-bold text-ink-100">{s.goals ?? 0}</Td>
      <Td className="text-center font-semibold text-ink-100">{s.assists ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.yellowCards ?? 0}</Td>
      <Td className="hidden text-center text-ink-400 sm:table-cell">{s.redCards ?? 0}</Td>
      <Td className="hidden text-center md:table-cell">
        {s.rating != null ? <span className="font-medium text-brand-300">{s.rating.toFixed(2)}</span> : '—'}
      </Td>
    </Tr>
  )
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function pick(entries: Array<[string, number | string | null]>): Array<{ label: string; value: string }> {
  return entries
    .filter(([, v]) => v != null && v !== '' && v !== 0)
    .map(([label, v]) => ({ label, value: String(v) }))
}

function StatBreakdown({ s }: { s: PlayerStatBlock }) {
  const groups = [
    {
      title: 'Hücum',
      rows: pick([
        ['Şut', num(s.shots?.total)],
        ['İsabetli şut', num(s.shots?.on)],
        ['Dribling', num(s.dribbles?.attempts)],
        ['Başarılı dribling', num(s.dribbles?.success)],
        ['Penaltı gol', num(s.penalty?.scored)],
      ]),
    },
    {
      title: 'Pas',
      rows: pick([
        ['Toplam pas', num(s.passes?.total)],
        ['Kilit pas', num(s.passes?.key)],
        ['Pas isabeti', s.passes?.accuracy != null ? `%${s.passes.accuracy}` : null],
      ]),
    },
    {
      title: 'Savunma & Mücadele',
      rows: pick([
        ['Top kapma', num(s.tackles?.total)],
        ['Blok', num(s.tackles?.blocks)],
        ['Kesme', num(s.tackles?.interceptions)],
        ['İkili mücadele', num(s.duels?.total)],
        ['Kazanılan mücadele', num(s.duels?.won)],
        ['Faul yaptığı', num(s.fouls?.committed)],
        ['Faul çektiği', num(s.fouls?.drawn)],
      ]),
    },
  ].filter((g) => g.rows.length > 0)

  if (groups.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {groups.map((g) => (
        <Card key={g.title}>
          <div className="section-label px-4 pt-3 text-ink-400">{g.title}</div>
          <ul className="px-2 py-1">
            {g.rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between px-2 py-1.5 text-sm">
                <span className="text-ink-400">{r.label}</span>
                <span className="score-num font-semibold text-ink-100">{r.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
