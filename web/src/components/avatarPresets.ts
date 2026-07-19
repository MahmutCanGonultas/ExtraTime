import type { ComponentType } from 'react'
import {
  Ball,
  Jersey,
  Boot,
  Glove,
  Goal,
  Trophy,
  CornerFlag,
  Armband,
  Whistle,
  Pitch,
  type IconProps,
} from './footballIcons'

// Ten hand-drawn, ALL-football avatars: a white glyph on a vivid gradient, rendered
// with depth by <MemberAvatar>. The user picks one in Settings; it shows everywhere
// their name appears. Storing just the id keeps the DB tiny.
export interface AvatarPreset {
  id: string
  label: string
  Icon: ComponentType<IconProps>
  from: string
  to: string
}

export const AVATARS: AvatarPreset[] = [
  { id: 'ball', label: 'Top', Icon: Ball, from: '#34d399', to: '#047857' },
  { id: 'jersey', label: 'Forma', Icon: Jersey, from: '#60a5fa', to: '#1e3a8a' },
  { id: 'boot', label: 'Krampon', Icon: Boot, from: '#fb7185', to: '#9f1239' },
  { id: 'glove', label: 'Eldiven', Icon: Glove, from: '#fbbf24', to: '#b45309' },
  { id: 'goal', label: 'Kale', Icon: Goal, from: '#38bdf8', to: '#075985' },
  { id: 'trophy', label: 'Kupa', Icon: Trophy, from: '#fcd34d', to: '#a16207' },
  { id: 'flag', label: 'Korner', Icon: CornerFlag, from: '#f472b6', to: '#9d174d' },
  { id: 'armband', label: 'Kaptan', Icon: Armband, from: '#c084fc', to: '#6b21a8' },
  { id: 'whistle', label: 'Düdük', Icon: Whistle, from: '#5eead4', to: '#0f766e' },
  { id: 'pitch', label: 'Saha', Icon: Pitch, from: '#4ade80', to: '#166534' },
]

export const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]))
