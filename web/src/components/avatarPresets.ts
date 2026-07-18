// Fun, colourful member avatars. Each preset is an emoji on a vivid gradient; the
// user picks one in Settings and it shows everywhere their name appears (members,
// standings, weekly champions, everyone's predictions). Storing just the preset id
// keeps the DB tiny — the emoji + colours live here and in <MemberAvatar>.

export interface AvatarPreset {
  id: string
  emoji: string
  from: string
  to: string
}

export const AVATARS: AvatarPreset[] = [
  { id: 'volt', emoji: '⚡', from: '#a8e60a', to: '#4d7c0f' },
  { id: 'fire', emoji: '🔥', from: '#fb923c', to: '#b91c1c' },
  { id: 'star', emoji: '⭐', from: '#fbbf24', to: '#b45309' },
  { id: 'crown', emoji: '👑', from: '#fde047', to: '#a16207' },
  { id: 'rocket', emoji: '🚀', from: '#818cf8', to: '#3730a3' },
  { id: 'lion', emoji: '🦁', from: '#f59e0b', to: '#92400e' },
  { id: 'tiger', emoji: '🐯', from: '#fb923c', to: '#9a3412' },
  { id: 'wolf', emoji: '🐺', from: '#94a3b8', to: '#334155' },
  { id: 'eagle', emoji: '🦅', from: '#a3a3a3', to: '#57534e' },
  { id: 'fox', emoji: '🦊', from: '#fb7185', to: '#9f1239' },
  { id: 'dragon', emoji: '🐲', from: '#34d399', to: '#065f46' },
  { id: 'shark', emoji: '🦈', from: '#38bdf8', to: '#0c4a6e' },
  { id: 'goal', emoji: '🥅', from: '#e2e8f0', to: '#64748b' },
  { id: 'gloves', emoji: '🧤', from: '#f472b6', to: '#9d174d' },
  { id: 'target', emoji: '🎯', from: '#f87171', to: '#7f1d1d' },
  { id: 'boom', emoji: '💥', from: '#facc15', to: '#c2410c' },
  { id: 'ghost', emoji: '👾', from: '#c084fc', to: '#6b21a8' },
  { id: 'robot', emoji: '🤖', from: '#5eead4', to: '#0f766e' },
  { id: 'ufo', emoji: '🛸', from: '#67e8f9', to: '#155e75' },
  { id: 'cap', emoji: '🧢', from: '#60a5fa', to: '#1e3a8a' },
  { id: 'shades', emoji: '🕶️', from: '#a1a1aa', to: '#27272a' },
  { id: 'trophy', emoji: '🏆', from: '#fcd34d', to: '#b45309' },
  { id: 'ball', emoji: '⚽', from: '#e5e7eb', to: '#4b5563' },
  { id: 'clover', emoji: '🍀', from: '#4ade80', to: '#166534' },
]

export const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]))
