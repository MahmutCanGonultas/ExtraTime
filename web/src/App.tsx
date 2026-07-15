import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { LeaguesPage } from '@/pages/LeaguesPage'
import { LeagueDetailPage } from '@/pages/LeagueDetailPage'
import { TeamPage } from '@/pages/TeamPage'
import { GroupPage } from '@/pages/GroupPage'
import { PredictionsPage } from '@/pages/PredictionsPage'
import { MatchPage } from '@/pages/MatchPage'
import { Placeholder } from '@/components/Placeholder'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/leagues" element={<LeaguesPage />} />
                <Route path="/leagues/:id" element={<LeagueDetailPage />} />
                <Route path="/teams/:id" element={<TeamPage />} />
                <Route path="/matches/:id" element={<MatchPage />} />
                <Route path="/group" element={<GroupPage />} />
                <Route path="/predictions" element={<PredictionsPage />} />
                <Route path="/stats" element={<Placeholder title="İstatistik" />} />
                <Route path="/admin" element={<Placeholder title="Admin" />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
