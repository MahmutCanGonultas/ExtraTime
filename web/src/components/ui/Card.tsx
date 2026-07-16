import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-ink-800 bg-ink-900 shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-3">
      <h3 className="section-label flex items-center gap-2 text-sm text-ink-100">
        <span className="h-4 w-1 shrink-0 rounded-full bg-brand-500" />
        {title}
      </h3>
      {action}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}
