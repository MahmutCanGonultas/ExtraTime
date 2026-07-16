import { cn } from '@/lib/cn'

// Members have no photo, so we give each a stable coloured "initials" disc — a bit
// of identity and colour so member lists don't read as a grey wall.
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
  size = 40,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
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
    >
      {initialsOf(name)}
    </div>
  )
}
