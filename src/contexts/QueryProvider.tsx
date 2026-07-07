'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/services/api';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created lazily in state so the client is stable per browser session
  // and never shared between SSR requests.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Backend errors (ApiError) are deterministic — retry only
            // transient transport failures, once.
            retry: (failureCount, error) =>
              failureCount < 1 && !(error instanceof ApiError),
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
