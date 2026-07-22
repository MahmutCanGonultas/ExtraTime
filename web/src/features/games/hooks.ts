import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DailyGrid, GridGuessResult, GoalQuestion, GoalGuessResult } from './types'

// The day's Kare Bulmaca grid (categories only; answers stay on the server).
export function useDailyGrid() {
  return useQuery({
    queryKey: ['games', 'grid'],
    queryFn: () => api.get<DailyGrid>('/games/grid'),
    staleTime: 1000 * 60 * 30,
  })
}

// Check one cell's guess. The caller owns which cell + player it validates.
export function useGridGuess() {
  return useMutation({
    mutationFn: (v: { row: number; col: number; playerApiId: number }) =>
      api.post<GridGuessResult>('/games/grid/guess', v),
  })
}

// The day's "Gol Kimin?" quiz (questions only; answers checked server-side).
export function useGoalQuiz() {
  return useQuery({
    queryKey: ['games', 'goal'],
    queryFn: () => api.get<{ date: string; questions: GoalQuestion[] }>('/games/goal'),
    staleTime: 1000 * 60 * 30,
  })
}

export function useGoalGuess() {
  return useMutation({
    mutationFn: (v: { eventId: number; choice: string }) =>
      api.post<GoalGuessResult>('/games/goal/guess', v),
  })
}
