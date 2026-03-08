// ============================================================
// Axon — React Query Client (singleton)
//
// Centralized QueryClient with sensible defaults for the
// student study flow. Imported by AuthLayout (root of router
// tree) to wrap everything in QueryClientProvider.
// ============================================================

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — data considered fresh
      gcTime: 10 * 60 * 1000,          // 10 min — keep in memory after unmount
      retry: 1,                         // 1 retry on network error
      refetchOnWindowFocus: false,      // no surprise refetches on tab switch
      refetchOnReconnect: true,         // refetch when coming back online
    },
  },
});
