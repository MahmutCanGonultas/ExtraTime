import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
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
                <Route path="/" element={<Placeholder title="Ana Sayfa" />} />
                <Route path="/leagues" element={<Placeholder title="Ligler" />} />
                <Route path="/leagues/:id" element={<Placeholder title="Lig" />} />
                <Route path="/teams/:id" element={<Placeholder title="Takım" />} />
                <Route path="/matches/:id" element={<Placeholder title="Maç" />} />
                <Route path="/group" element={<Placeholder title="Grup" />} />
                <Route path="/predictions" element={<Placeholder title="Tahminler" />} />
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
