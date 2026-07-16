import { useState } from 'react'
import { ListChecks, Target, Trophy, Star, ChevronDown, HelpCircle } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

const scoring = [
  { label: 'Tam skoru bilirsen', points: 5, tone: 'text-brand-300' },
  { label: 'Kazananı bilirsen', points: 3, tone: 'text-ink-100' },
  { label: 'Beraberliği bilirsen', points: 1, tone: 'text-ink-100' },
  { label: 'Yanlış tahmin', points: 0, tone: 'text-ink-500' },
]

const steps = [
  { icon: ListChecks, text: 'Başkan maçları oyuna ekler.' },
  { icon: Target, text: 'Her maçta “kim kazanır”ı seçersin; istersen tam skoru da girersin.' },
  { icon: Trophy, text: 'Oyun bitince en çok puanlı şampiyon olur.' },
]

// Collapsible so the rules don't dominate the prediction screen every visit.
export function HowToPlay() {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <HelpCircle className="h-4 w-4 text-brand-400" />
        <span className="text-sm font-semibold text-ink-100">Nasıl oynanır?</span>
        <span className="ml-1 truncate text-xs text-ink-500">
          Kazanan 3 · Beraberlik 1 · Tam skor 5 · Joker 2×
        </span>
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-ink-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <CardBody className="space-y-4 border-t border-ink-800 pt-4">
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-ink-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 text-brand-300">
                  <s.icon className="h-4 w-4" />
                </span>
                {s.text}
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-850 p-3 sm:grid-cols-4">
            {scoring.map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-2xl font-extrabold tabular-nums ${s.tone}`}>{s.points}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-ink-400">{s.label}</div>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-2 text-xs text-ink-400">
            <Star className="h-4 w-4 shrink-0 fill-amber-300 text-amber-300" />
            Her oyunda <span className="font-semibold text-amber-300">1 maça joker</span> koyabilirsin —
            o maçtan kazandığın puan 2 katına çıkar.
          </p>
        </CardBody>
      )}
    </Card>
  )
}
