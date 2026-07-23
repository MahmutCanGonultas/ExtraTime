import { Component, type ReactNode } from 'react'

// App-wide safety net: a render error anywhere below this boundary shows a
// friendly reload screen instead of a blank white page — important for a site
// that runs unattended, where nobody is watching the console.
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught a render error:', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-ink-950 px-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-emerald-600 text-2xl">
              ⚽
            </div>
            <h1 className="text-lg font-bold text-ink-100">Bir şeyler ters gitti</h1>
            <p className="mt-1.5 text-sm text-ink-400">
              Beklenmeyen bir hata oluştu. Sayfayı yenilemek genelde çözer.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-brand-400"
            >
              Sayfayı yenile
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
