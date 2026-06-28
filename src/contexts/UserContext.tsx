'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
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

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchUser = useCallback(async () => {
    // Simple deduplication: only one fetch at a time
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const { default: ApiService } = await import('@/services/api');
      const userData = await ApiService.getUserInfo();
      setUser(userData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch user information'));
      setUser(null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const logout = async () => {
    try {
      const { default: ApiService } = await import('@/services/api');
      await ApiService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      const { disconnectCentrifuge } = await import('@/realtime/centrifugoClient');
      disconnectCentrifuge();
      setUser(null);
      setError(null);
    }
  };

  useEffect(() => {
    // Auto-fetch user on mount if refresh token exists
    if (typeof window !== 'undefined' && localStorage.getItem('refresh_token_id')) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, loading, error, fetchUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};