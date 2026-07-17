import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      {/* tabular-nums keeps every digit the same width so stat columns line up
          exactly under their (centered) headers instead of looking ragged. */}
      <table
        className={cn('w-full border-collapse text-sm tabular-nums', className)}
        {...props}
      />
    </div>
  )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  // cn() is a plain joiner, not tailwind-merge, so a default `text-left` would
  // sit alongside a caller's `text-center` and CSS source-order (not intent)
  // would decide the winner — leaving numeric headers off their columns. Only
  // apply the left default when the caller passes no explicit text-align.
  const hasAlign = /(?:^|\s)text-(?:left|center|right|justify)(?:\s|$)/.test(className ?? '')
  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-400',
        !hasAlign && 'text-left',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-t border-ink-800 px-3 py-2 text-ink-200', className)} {...props} />
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-ink-850/60', className)} {...props} />
}
