import { cn } from '@/lib/cn'
import { AVATAR_BY_ID } from './avatarPresets'

// Members have no photo. If they've picked a preset avatar we show its emoji on a
// vivid gradient; otherwise we fall back to a stable coloured "initials" disc — a
// bit of identity and colour so member lists never read as a grey wall.
const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316']

function colorFor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MemberAvatar({
  name,
  avatar,
  size = 40,
  className,
}: {
  name: string
  avatar?: string | null
  size?: number
  className?: string
}) {
  const preset = avatar ? AVATAR_BY_ID.get(avatar) : undefined

  if (preset) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full ring-1 ring-white/15',
          className,
        )}
        style={{
          width: size,
          height: size,
          backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
          fontSize: size * 0.52,
          lineHeight: 1,
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25)',
        }}
        title={name}
        aria-hidden
      >
        {preset.emoji}
      </div>
    )
  }

  const color = colorFor(name)
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-bold', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        color,
        fontSize: size * 0.38,
        border: `1px solid ${color}44`,
      }}
      title={name}
    >
      {initialsOf(name)}
    </div>
  )
}
