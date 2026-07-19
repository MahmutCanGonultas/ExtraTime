import {
  Trophy,
  Crown,
  Flame,
  Zap,
  Star,
  Rocket,
  Shield,
  Gem,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'

// A small, hand-curated set of avatars: a crisp white icon on a rich two-stop
// gradient, rendered with depth (a top highlight + soft shadow) by <MemberAvatar>
// so they read as designed emblems, not casual emoji. Each has a distinct hue so a
// group's roster is colourful. Storing just the id keeps the DB tiny.

export interface AvatarPreset {
  id: string
  label: string
  Icon: LucideIcon
  from: string
  to: string
}

export const AVATARS: AvatarPreset[] = [
  { id: 'trophy', label: 'Kupa', Icon: Trophy, from: '#fcd34d', to: '#b45309' },
  { id: 'crown', label: 'Taç', Icon: Crown, from: '#c4b5fd', to: '#6d28d9' },
  { id: 'flame', label: 'Ateş', Icon: Flame, from: '#fb923c', to: '#b91c1c' },
  { id: 'volt', label: 'Volt', Icon: Zap, from: '#d9f99d', to: '#4d7c0f' },
  { id: 'star', label: 'Yıldız', Icon: Star, from: '#7dd3fc', to: '#1d4ed8' },
  { id: 'rocket', label: 'Roket', Icon: Rocket, from: '#5eead4', to: '#0f766e' },
  { id: 'shield', label: 'Kalkan', Icon: Shield, from: '#cbd5e1', to: '#334155' },
  { id: 'gem', label: 'Elmas', Icon: Gem, from: '#fda4af', to: '#be123c' },
  { id: 'spark', label: 'Işıltı', Icon: Sparkles, from: '#f0abfc', to: '#a21caf' },
  { id: 'target', label: 'Hedef', Icon: Target, from: '#67e8f9', to: '#0e7490' },
]

export const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]))
