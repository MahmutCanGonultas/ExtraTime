import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useSearch } from './hooks'
import { TeamLogo } from '@/components/TeamLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Spinner } from '@/components/ui/feedback'

// Global search in the header: type a team or player name and jump straight to
// its detail page. Debounced, closes on outside-click / Escape / navigation.
export function SearchBar() {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { data, isFetching } = useSearch(debounced)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 220)
    return () => clearTimeout(t)
  }, [term])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function go(to: string) {
    setOpen(false)
    setTerm('')
    setDebounced('')
    navigate(to)
  }

  const teams = data?.teams ?? []
  const players = data?.players ?? []
  const hasResults = teams.length + players.length > 0
  const active = debounced.trim().length >= 2
  const showDropdown = open && active

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 transition focus-within:border-brand-500">
        <Search className="h-4 w-4 shrink-0 text-ink-500" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Takım veya oyuncu ara…"
          className="w-full bg-transparent text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
          aria-label="Ara"
        />
        {term && (
          <button onClick={() => setTerm('')} className="shrink-0 text-ink-500 hover:text-ink-200" aria-label="Temizle">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-card border border-ink-700 bg-ink-900 py-2 shadow-2xl shadow-black/40">
          {isFetching && !hasResults ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-5 text-center text-sm text-ink-500">"{debounced}" için sonuç yok</div>
          ) : (
            <>
              {teams.length > 0 && (
                <div>
                  <div className="section-label px-4 py-1 text-[10px] text-ink-500">Takımlar</div>
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => go(`/teams/${t.id}`)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-ink-850"
                    >
                      <TeamLogo apiId={t.apiFootballId} size={22} />
                      <span className="truncate text-sm text-ink-100">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {players.length > 0 && (
                <div className={teams.length > 0 ? 'mt-1 border-t border-ink-850 pt-1' : ''}>
                  <div className="section-label px-4 py-1 text-[10px] text-ink-500">Oyuncular</div>
                  {players.map((p) => (
                    <button
                      key={p.playerApiId}
                      onClick={() => go(`/players/${p.playerApiId}`)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-ink-850"
                    >
                      <PlayerAvatar playerApiId={p.playerApiId} name={p.name} size={24} />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{p.name}</span>
                      {p.teamName && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-ink-500">
                          {p.teamApiId != null && <TeamLogo apiId={p.teamApiId} size={13} />}
                          <span className="hidden sm:inline">{p.teamName}</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
