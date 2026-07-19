import type { CSSProperties, ReactNode } from 'react'

// Hand-drawn, football-only avatar glyphs (all currentColor so they render white on
// the gradient). Kept bold + simple so they read at ~24px. Used by the avatar set.
export interface IconProps {
  size?: number
  className?: string
  style?: CSSProperties
}

function Svg({ size = 24, className, style, children, stroke }: IconProps & { children: ReactNode; stroke?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill={stroke ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : undefined}
      strokeWidth={stroke ? 1.7 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

// ⚽ Classic soccer ball
export function Ball(p: IconProps) {
  return (
    <Svg {...p} stroke>
      <circle cx="12" cy="12" r="9" />
      <polygon points="12,7.1 15.7,9.8 14.3,14.1 9.7,14.1 8.3,9.8" fill="currentColor" stroke="none" />
      <path d="M12 7.1V3.4M15.7 9.8l3.3-1.1M14.3 14.1l1.9 3.1M9.7 14.1l-1.9 3.1M8.3 9.8 5 8.7" />
    </Svg>
  )
}

// 👕 Jersey
export function Jersey(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3 5 5 2.6 8.6l3 2.2 1.4-1.2V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.6l1.4 1.2 3-2.2L19 5l-4-2a3.2 3.2 0 0 1-6 0Z" />
    </Svg>
  )
}

// 🥅 Goal + net
export function Goal(p: IconProps) {
  return (
    <Svg {...p} stroke>
      <path d="M3 6h18v11" />
      <path d="M3 6v11h18" />
      <path d="M3 17h18" />
      <path d="M7 6v11M11 6v11M15 6v11M19 6v11M3 9.7h18M3 13.4h18" strokeWidth="1" opacity="0.85" />
    </Svg>
  )
}

// 🧤 Goalkeeper glove
export function Glove(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 11V5.5a1.3 1.3 0 0 1 2.6 0V10h.5V4a1.3 1.3 0 0 1 2.6 0v6h.5V4.4a1.3 1.3 0 0 1 2.6 0V10h.5V6.2a1.3 1.3 0 0 1 2.6 0V13a7 7 0 0 1-7 7 6 6 0 0 1-6-6v-1.3a1.85 1.85 0 0 1 2-1.4Z" />
    </Svg>
  )
}

// 👟 Football boot with studs
export function Boot(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 7.2c0-.7.6-1.2 1.3-1.2h5.4c1 0 1.8.4 3.4 1.9 1.6 1.4 4.6 1.7 6.9 2.9 1 .5 1.5 1.3 1.5 2.4v1.3c0 .6-.5 1-1 1H4a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M4.5 17.4h2M9 17.4h2M13.5 17.4h2M18 17.4h2" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </Svg>
  )
}

// 🏆 Trophy
export function Trophy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10v3a5 5 0 0 1-10 0Z" />
      <path d="M7 5H4.5v1.5A2.5 2.5 0 0 0 7 9M17 5h2.5v1.5A2.5 2.5 0 0 1 17 9" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <rect x="10.7" y="11.4" width="2.6" height="3.4" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0Z" />
      <rect x="7.5" y="19.2" width="9" height="1.8" rx="0.9" />
    </Svg>
  )
}

// 🚩 Corner flag
export function CornerFlag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3.5v17" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M8 4.3l9.5 2.6L8 9.9Z" />
      <path d="M4 20.5h8" stroke="currentColor" strokeWidth="1.8" fill="none" />
    </Svg>
  )
}

// 🎽 Captain armband (band with a C)
export function Armband(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5Z" opacity="0.9" />
      <path
        d="M15 10a3.2 3.2 0 1 0 0 4"
        fill="none"
        stroke="#000"
        strokeOpacity="0.55"
        strokeWidth="1.8"
      />
    </Svg>
  )
}

// Referee whistle
export function Whistle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11a5 5 0 0 0 5 5h4.2a4 4 0 1 0 0-8H8a5 5 0 0 0-5 3Z" />
      <circle cx="12.3" cy="12" r="2" fill="#000" fillOpacity="0.5" />
      <path d="M9.5 6.2 12 3.2M12.5 6 15.5 3.6M15.2 6.6 18.5 4.6" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </Svg>
  )
}

// Pitch (top-down field)
export function Pitch(p: IconProps) {
  return (
    <Svg {...p} stroke>
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <path d="M12 4.5v15" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M3 8.5h2.5v7H3M21 8.5h-2.5v7H21" />
    </Svg>
  )
}
