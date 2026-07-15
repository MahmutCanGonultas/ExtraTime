import { useState } from 'react'
import { Lock } from 'lucide-react'
import type { Fixture } from '@/features/football/types'
import { useUpsertPrediction } from '@/features/groups/hooks'
import { TeamLogo } from '@/components/TeamLogo'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useCountdown, formatCountdown } from '@/lib/useCountdown'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'

export function MatchPredictCard({
  fixture,
  groupId,
  existingHome,
  existingAway,
}: {
  fixture: Fixture
  groupId: number
  existingHome?: number | null
  existingAway?: number | null
}) {
  const countdown = useCountdown(fixture.kickoffAt)
  const upsert = useUpsertPrediction(groupId)
  const [home, setHome] = useState(existingHome != null ? String(existingHome) : '')
  const [away, setAway] = useState(existingAway != null ? String(existingAway) : '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locked = countdown.locked
  const canSave = home !== '' && away !== '' && !locked && !upsert.isPending

  async function save() {
    setError(null)
    try {
      await upsert.mutateAsync({
        fixtureId: fixture.id,
        predictedHome: Number(home),
        predictedAway: Number(away),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi')
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between text-xs text-ink-400">
          <span>{formatDateTime(fixture.kickoffAt)}</span>
          {locked ? (
            <Badge tone="neutral">
              <Lock className="mr-1 h-3 w-3" /> Kilitli
            </Badge>
          ) : (
            <Badge tone="brand">{formatCountdown(countdown)}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamLogo apiId={fixture.home.apiFootballId} size={22} />
            <span className="truncate text-sm text-ink-100">{fixture.home.name}</span>
          </div>
          <ScoreBox value={home} onChange={setHome} disabled={locked} />
          <span className="text-ink-500">-</span>
          <ScoreBox value={away} onChange={setAway} disabled={locked} />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right text-sm text-ink-100">{fixture.away.name}</span>
            <TeamLogo apiId={fixture.away.apiFootballId} size={22} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-xs text-loss">{error}</span>
          ) : saved ? (
            <span className="text-xs text-brand-300">Kaydedildi ✓</span>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={save} disabled={!canSave}>
            {upsert.isPending ? '...' : 'Kaydet'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

function ScoreBox({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <input
      inputMode="numeric"
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
        onChange(v)
      }}
      className="h-10 w-11 rounded-lg border border-ink-700 bg-ink-850 text-center text-lg font-bold text-ink-100 focus:border-brand-500 focus:outline-none disabled:opacity-50"
    />
  )
}
