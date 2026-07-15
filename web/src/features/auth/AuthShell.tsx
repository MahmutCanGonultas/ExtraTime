import type { ReactNode } from 'react'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src="/favicon.svg" width={40} height={40} alt="" />
          <h1 className="text-xl font-bold text-ink-100">{title}</h1>
          {subtitle && <p className="text-sm text-ink-400">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-5 text-center text-sm text-ink-400">{footer}</div>}
      </div>
    </div>
  )
}
