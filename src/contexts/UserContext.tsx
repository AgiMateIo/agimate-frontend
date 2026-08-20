'use client';

import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiService, { hasStoredSession } from '@/services/api';
import { User } from '@/services/types';
import { getErrorMessage } from '@/utils/error';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const userKeys = {
  all: ['user'] as const,
  me: () => [...userKeys.all, 'me'] as const,
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const queryClient = useQueryClient();

  // The "is anyone signed in" check lives inside the query function rather than
  // in `enabled`: localStorage is unreadable during SSR, and a disabled query
  // would report "not loading, no user" on the first render — long enough for a
  // protected page to bounce to /login. Pending until the answer is known is
  // what the effect-based version did, and what consumers still expect.
  const query = useQuery({
    queryKey: userKeys.me(),
    queryFn: async (): Promise<User | null> =>
      hasStoredSession() ? await apiService.getUserInfo() : null,
    // `retry` is left at the provider default (one attempt for transport
    // failures, none for a backend ApiError). A dead session never reaches
    // here — the transport refreshes the token and hard-redirects to /login
    // when that fails — so a failure here is the network, and the first read
    // failing is what sends a signed-in person to /login.
    //
    // Read once per page load, as the effect-based version did. A dropped
    // connection coming back would otherwise refetch in the background, and a
    // gateway hiccup on that refetch reads as "no user" — which the dashboard
    // layout answers by pushing a signed-in person to /login.
    refetchOnReconnect: false,
  });

  // Destructured rather than used as `query.refetch`: the query object is a new
  // identity every render, which would make `fetchUser` — and the context value
  // built from it — change on every render too.
  const { refetch } = query;
  const fetchUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      const { disconnectCentrifuge } = await import('@/realtime/centrifugoClient');
      disconnectCentrifuge();
      queryClient.setQueryData<User | null>(userKeys.me(), null);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      // A failed *re*read keeps the last known user. An expired session never
      // arrives here — the transport refreshes the token and hard-redirects to
      // /login when that fails — so an error at this level is the network, and
      // dropping the user over one would sign a working session out. Nothing is
      // still the answer when the very first read fails: `data` is undefined.
      user: query.data ?? null,
      loading: query.isPending,
      error: query.error ? getErrorMessage(query.error, 'Failed to fetch user information') : null,
      fetchUser,
      logout,
    }),
    [query.data, query.error, query.isPending, fetchUser, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
