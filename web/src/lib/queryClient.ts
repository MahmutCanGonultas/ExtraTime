import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry auth/permission/not-found errors — retrying won't help.
        if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) return false
        return failureCount < 2
      },
    },
  },
})
