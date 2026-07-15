import { useState } from 'react'
import { playerPhotoUrl } from '@/lib/format'
import { cn } from '@/lib/cn'

// Circular player headshot from the media server, falling back to a neutral disc
// with the player's initial when there is no id or the image fails.
export function PlayerAvatar({
  playerApiId,
  name,
  size = 44,
  className,
}: {
  playerApiId: number | null
  name: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const initial = name?.trim().charAt(0).toUpperCase() || '?'

  if (playerApiId == null || failed) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-ink-700 font-semibold text-ink-300',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={playerPhotoUrl(playerApiId)}
      width={size}
      height={size}
      loading="lazy"
      alt=""
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-full bg-ink-800 object-cover', className)}
      style={{ width: size, height: size }}
    />
  )
}
