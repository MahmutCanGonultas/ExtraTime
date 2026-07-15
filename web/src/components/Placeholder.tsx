import { Hammer } from 'lucide-react'
import { EmptyState } from '@/components/ui/feedback'

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink-100">{title}</h1>
      <EmptyState
        icon={<Hammer className="h-8 w-8" />}
        title="Bu bölüm yapım aşamasında"
        description="Yakında burada olacak."
      />
    </div>
  )
}
