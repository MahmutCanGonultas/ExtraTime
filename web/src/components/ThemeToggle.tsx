import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getTheme, setTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/cn'

// Light/dark switch. The theme lives on <html data-theme>; this just flips it and
// remembers the choice.
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }
  return (
    <button
      onClick={toggle}
      title={theme === 'light' ? 'Koyu temaya geç' : 'Aydınlık temaya geç'}
      aria-label="Tema değiştir"
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 transition hover:bg-ink-850 hover:text-ink-100',
        className,
      )}
    >
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}
