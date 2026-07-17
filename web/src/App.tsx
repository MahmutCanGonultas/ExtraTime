import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'

// Sets the browser-tab title from the current route.
const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, 'Ana Sayfa'],
  [/^\/leagues\/\d+/, 'Lig'],
  [/^\/leagues/, 'Ligler'],
  [/^\/teams\//, 'Takım'],
  [/^\/players\//, 'Oyuncu'],
  [/^\/matches\//, 'Maç'],
  [/^\/group/, 'Grup'],
  [/^\/predictions/, 'Tahminler'],
  [/^\/oyun/, 'Gol Düellosu'],
  [/^\/kadro-kur/, 'Kadro Kur'],
  [/^\/kim-bu/, 'Kim Bu?'],
  [/^\/admin/, 'Admin'],
  [/^\/settings/, 'Ayarlar'],
  [/^\/login/, 'Giriş'],
  [/^\/register/, 'Kayıt'],
]

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const match = TITLES.find(([re]) => re.test(pathname))
    document.title = match ? `${match[1]} · EXTRATIME` : 'EXTRATIME'
  }, [pathname])
  return null
}
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { LeaguesPage } from '@/pages/LeaguesPage'
import { LeagueDetailPage } from '@/pages/LeagueDetailPage'
import { TeamPage } from '@/pages/TeamPage'
import { SquadPage } from '@/pages/SquadPage'
import { PlayerDetailPage } from '@/pages/PlayerDetailPage'
import { GroupHubPage } from '@/pages/GroupHubPage'
import { MiniGamePage } from '@/pages/MiniGamePage'
import { LineupBuilderPage } from '@/pages/LineupBuilderPage'
import { GuessPlayerPage } from '@/pages/GuessPlayerPage'
import { MatchPage } from '@/pages/MatchPage'
import { AdminPage } from '@/pages/AdminPage'
import { SettingsPage } from '@/pages/SettingsPage'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <RouteTitle />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/leagues" element={<LeaguesPage />} />
                <Route path="/leagues/:id" element={<LeagueDetailPage />} />
                <Route path="/teams/:id" element={<TeamPage />} />
                <Route path="/teams/:id/squad" element={<SquadPage />} />
                <Route path="/players/:apiId" element={<PlayerDetailPage />} />
                <Route path="/matches/:id" element={<MatchPage />} />
                <Route path="/group" element={<GroupHubPage />} />
                <Route path="/predictions" element={<Navigate to="/group" replace />} />
                <Route path="/oyun" element={<MiniGamePage />} />
                <Route path="/kadro-kur" element={<LineupBuilderPage />} />
                <Route path="/kim-bu" element={<GuessPlayerPage />} />
                <Route path="/stats" element={<Navigate to="/" replace />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
