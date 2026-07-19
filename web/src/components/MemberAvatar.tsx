import { cn } from '@/lib/cn'
import { AVATAR_BY_ID } from './avatarPresets'

// Members have no photo. If they've picked a preset avatar we render its icon on a
// rich gradient with a little depth (a top highlight + soft shadow + light ring) so
// it reads as a designed emblem; otherwise we fall back to a stable coloured
// "initials" disc — a bit of identity and colour so lists never read as a grey wall.
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
    const Icon = preset.Icon
    return (
      <div
        className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', className)}
        style={{
          width: size,
          height: size,
          backgroundImage: `linear-gradient(140deg, ${preset.from} 0%, ${preset.to} 100%)`,
          boxShadow: `inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.35)`,
        }}
        title={`${name} · ${preset.label}`}
        aria-hidden
      >
        {/* Soft top-left sheen for a glassy, dimensional look. */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            backgroundImage: 'radial-gradient(65% 55% at 32% 24%, rgba(255,255,255,0.40), transparent 60%)',
          }}
        />
        {/* Hairline light ring to crisp the edge against dark surfaces. */}
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
        <Icon
          size={Math.round(size * 0.56)}
          className="relative text-white"
          style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))' }}
        />
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
