import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DailyGrid, GridGuessResult } from './types'

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
