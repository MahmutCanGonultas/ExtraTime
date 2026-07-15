import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-brand-400', className)} aria-hidden />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink-800', className)} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icon && <div className="mb-1 text-ink-500">{icon}</div>}
      <p className="font-medium text-ink-200">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="font-medium text-loss">Bir şeyler ters gitti</p>
      <p className="max-w-sm text-sm text-ink-400">{message ?? 'Veri yüklenemedi.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-medium text-brand-300 hover:underline">
          Tekrar dene
        </button>
      )}
    </div>
  )
}
