import { cn } from '@/lib/cn'

// Renders the last few W/D/L results as colored chips (green=win, gray=draw,
// red=loss) — the same color meaning used everywhere in the app.
const styles: Record<string, string> = {
  W: 'bg-win text-ink-950',
  D: 'bg-draw text-ink-950',
  L: 'bg-loss text-white',
}

export function FormBadges({ form }: { form: string | null }) {
  if (!form) return <span className="text-ink-600">—</span>
  return (
    <span className="inline-flex gap-1">
      {form
        .slice(-5)
        .split('')
        .map((result, i) => (
          <span
            key={i}
            className={cn(
              'grid h-5 w-5 place-items-center rounded text-[10px] font-bold',
              styles[result] ?? 'bg-ink-700 text-ink-200',
            )}
          >
            {result}
          </span>
        ))}
    </span>
  )
}
