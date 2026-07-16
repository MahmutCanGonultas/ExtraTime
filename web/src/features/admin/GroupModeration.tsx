import { useState } from 'react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import {
  useAdminAddFixture,
  useAdminAdjustPoints,
  useAdminCandidateFixtures,
  useAdminGroupOverview,
  useAdminGroups,
  useAdminRemoveFixture,
  useAdminRemoveMember,
  useAdminResetMemberPassword,
} from './hooks'
import { TeamLogo } from '@/components/TeamLogo'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, EmptyState } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

// Platform-admin god-mode: step into any group to fix matches or points.
export function GroupModeration() {
  const groups = useAdminGroups()
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <Card>
      <CardHeader title="Tüm Gruplar — Platform Yönetimi" />
      <CardBody>
        {groups.isLoading ? (
          <Skeleton className="h-24" />
        ) : !groups.data?.length ? (
          <EmptyState title="Grup yok" />
        ) : (
          <ul className="space-y-1">
            {groups.data.map((g) => (
              <li key={g.id} className="rounded-lg bg-ink-850">
                <button
                  onClick={() => setOpenId((v) => (v === g.id ? null : g.id))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  <span className="text-sm font-semibold text-ink-100">{g.name}</span>
                  <span className="text-xs text-ink-400">{g.memberCount} üye</span>
                  <Badge tone={g.activeSeasonTitle ? 'brand' : 'neutral'}>
                    {g.activeSeasonTitle ?? 'oyun yok'}
                  </Badge>
                  <ChevronDown
                    className={cn('ml-auto h-4 w-4 text-ink-500 transition', openId === g.id && 'rotate-180')}
                  />
                </button>
                {openId === g.id && <GroupDetail groupId={g.id} />}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

const DELTAS = [-3, -1, 1, 3]

function GroupDetail({ groupId }: { groupId: number }) {
  const overview = useAdminGroupOverview(groupId, true)
  const adjust = useAdminAdjustPoints(groupId)
  const removeFixture = useAdminRemoveFixture(groupId)
  const removeMember = useAdminRemoveMember(groupId)
  const resetPw = useAdminResetMemberPassword(groupId)
  const [tempPw, setTempPw] = useState<{ name: string; password: string } | null>(null)

  if (overview.isLoading || !overview.data) return <Skeleton className="m-3 h-40" />
  const { standings, fixtures, group } = overview.data

  return (
    <div className="space-y-4 border-t border-ink-800 px-3 py-3">
      {/* Points */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Puanlar (ekle / sil)
        </div>
        <ul className="space-y-1">
          {standings.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{m.displayName}</span>
              {m.adjustment !== 0 && (
                <span className="text-[11px] text-ink-500">
                  ({m.adjustment > 0 ? '+' : ''}
                  {m.adjustment})
                </span>
              )}
              <span className="w-8 text-right text-sm font-bold text-ink-100">{m.points}</span>
              <div className="flex shrink-0 gap-1">
                {DELTAS.map((d) => (
                  <button
                    key={d}
                    disabled={adjust.isPending}
                    onClick={() => adjust.mutate({ userId: m.userId, delta: d })}
                    className={cn(
                      'h-6 w-7 rounded text-xs font-bold transition disabled:opacity-40',
                      d > 0
                        ? 'bg-brand-500/15 text-brand-300 hover:bg-brand-500/25'
                        : 'bg-loss/15 text-loss hover:bg-loss/25',
                    )}
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Matches */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Oyun maçları
        </div>
        {fixtures.length === 0 ? (
          <p className="text-xs text-ink-500">Oyunda maç yok.</p>
        ) : (
          <ul className="space-y-0.5">
            {fixtures.map((f) => (
              <li key={f.fixtureId} className="flex items-center gap-2 py-0.5 text-xs">
                <TeamLogo apiId={f.homeApiId} size={14} />
                <span className="min-w-0 flex-1 truncate text-ink-300">
                  {f.homeName} <span className="text-ink-600">-</span> {f.awayName}
                </span>
                <span className="shrink-0 tabular-nums text-ink-500">
                  {f.homeScore != null ? `${f.homeScore}:${f.awayScore}` : ''}
                </span>
                {f.open && (
                  <button
                    onClick={() => removeFixture.mutate(f.fixtureId)}
                    title="Maçı çıkar"
                    className="shrink-0 rounded p-0.5 text-ink-500 hover:text-loss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <AdminAddMatch groupId={groupId} />
      </div>

      {/* Members */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Üyeler</div>
        <ul className="space-y-0.5">
          {standings.map((m) => {
            const isLeader = m.userId === group.adminUserId
            return (
              <li key={m.userId} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="min-w-0 flex-1 truncate text-ink-200">
                  {m.displayName}
                  {isLeader && <span className="ml-1 text-brand-300">başkan</span>}
                </span>
                {!isLeader && (
                  <>
                    <button
                      onClick={() =>
                        resetPw.mutate(m.userId, {
                          onSuccess: (r) => setTempPw({ name: m.displayName, password: r.temporaryPassword }),
                        })
                      }
                      className="rounded px-1.5 py-0.5 text-ink-400 hover:text-brand-300"
                    >
                      Şifre sıfırla
                    </button>
                    <button
                      onClick={() => removeMember.mutate(m.userId)}
                      className="rounded px-1.5 py-0.5 text-ink-400 hover:text-loss"
                    >
                      Çıkar
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {tempPw && (
          <div className="mt-2 rounded-lg border border-ink-700 bg-ink-900 p-2 text-xs">
            <span className="text-ink-300">{tempPw.name} için geçici şifre: </span>
            <span className="font-mono font-bold text-brand-300">{tempPw.password}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminAddMatch({ groupId }: { groupId: number }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const candidates = useAdminCandidateFixtures(groupId, open)
  const add = useAdminAddFixture(groupId)

  const list = (candidates.data ?? []).filter((f) => {
    if (!q) return true
    const t = q.toLocaleLowerCase('tr')
    return (
      f.homeName.toLocaleLowerCase('tr').includes(t) || f.awayName.toLocaleLowerCase('tr').includes(t)
    )
  })

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200"
      >
        <Plus className="h-3.5 w-3.5" /> Maç ekle
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-ink-900 p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Takım ara"
              className="h-8 w-full rounded-md border border-ink-700 bg-ink-850 pl-7 pr-2 text-xs text-ink-100 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          {candidates.isLoading ? (
            <Skeleton className="h-24" />
          ) : list.length === 0 ? (
            <p className="py-3 text-center text-xs text-ink-500">Eklenecek maç yok.</p>
          ) : (
            <ul className="no-scrollbar max-h-56 space-y-0.5 overflow-y-auto">
              {list.slice(0, 60).map((f) => (
                <li key={f.fixtureId} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-ink-850">
                  <span className="w-20 shrink-0 text-[10px] text-ink-500">
                    {formatDateTime(f.kickoffAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-300">
                    {f.homeName} - {f.awayName}
                  </span>
                  <button
                    onClick={() => add.mutate(f.fixtureId)}
                    disabled={add.isPending}
                    className="shrink-0 rounded bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-300 hover:bg-brand-500/25 disabled:opacity-50"
                  >
                    Ekle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
