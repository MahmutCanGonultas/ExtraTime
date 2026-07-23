// Full-screen offline page, shown when the backend is unreachable (503). Mirrors
// the ErrorBoundary screen on purpose, so a paused site reads exactly like the
// app's normal "something went wrong" state — a plain, generic server error.
export function SiteDown() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-emerald-600 text-2xl">
          ⚽
        </div>
        <h1 className="text-lg font-bold text-ink-100">Bir şeyler ters gitti</h1>
        <p className="mt-1.5 text-sm text-ink-400">
          Sunucuya şu anda ulaşılamıyor. Geçici bir sorun olabilir; lütfen birazdan
          tekrar deneyin.
        </p>
        <p className="mt-2 text-xs text-ink-600">Hata kodu: 503</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-brand-400"
        >
          Yeniden dene
        </button>
      </div>
    </div>
  )
}
