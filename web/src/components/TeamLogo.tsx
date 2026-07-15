import { useState } from 'react'
import { teamLogoUrl, leagueLogoUrl } from '@/lib/format'
import { cn } from '@/lib/cn'

// Renders a team or league crest from the media server, with a neutral fallback
// disc if the image fails to load.
export function TeamLogo({
  apiId,
  kind = 'team',
  size = 24,
  className,
}: {
  apiId: number
  kind?: 'team' | 'league'
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = kind === 'team' ? teamLogoUrl(apiId) : leagueLogoUrl(apiId)

  if (failed) {
    return (
      <div
        className={cn('shrink-0 rounded-full bg-ink-700', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      loading="lazy"
      alt=""
      onError={() => setFailed(true)}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}
