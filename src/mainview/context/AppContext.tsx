import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Re-export FilterView so any existing imports keep working
export type { FilterView } from '@/stores/ui-store'

// ============================================================
// Query client — created once, shared across the app
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // Consider data fresh for 30s
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ============================================================
// Public Provider — wraps children with QueryClientProvider
// ============================================================

export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
