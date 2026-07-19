// Ten avatars, ALL football, each an instantly-recognisable football emoji on its
// own vivid gradient (rendered with depth by <MemberAvatar>). Emoji beat hand-drawn
// SVGs here: they read as football at a glance and render consistently everywhere.
export interface AvatarPreset {
  id: string
  label: string
  emoji: string
  from: string
  to: string
}

export const AVATARS: AvatarPreset[] = [
  { id: 'ball', label: 'Top', emoji: '⚽', from: '#34d399', to: '#047857' },
  { id: 'goal', label: 'Kale', emoji: '🥅', from: '#38bdf8', to: '#075985' },
  { id: 'gloves', label: 'Eldiven', emoji: '🧤', from: '#fbbf24', to: '#b45309' },
  { id: 'jersey', label: 'Forma', emoji: '👕', from: '#60a5fa', to: '#1e3a8a' },
  { id: 'boot', label: 'Krampon', emoji: '👟', from: '#fb7185', to: '#9f1239' },
  { id: 'trophy', label: 'Kupa', emoji: '🏆', from: '#fcd34d', to: '#a16207' },
  { id: 'corner', label: 'Korner', emoji: '🚩', from: '#f472b6', to: '#9d174d' },
  { id: 'stadium', label: 'Stadyum', emoji: '🏟️', from: '#a78bfa', to: '#5b21b6' },
  { id: 'fan', label: 'Taraftar', emoji: '📣', from: '#5eead4', to: '#0f766e' },
  { id: 'clock', label: 'Maç süresi', emoji: '⏱️', from: '#c084fc', to: '#6b21a8' },
]

export const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]))
