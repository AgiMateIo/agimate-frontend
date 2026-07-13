'use client';

import { useUser } from '@/contexts/UserContext';

// Whether the current user is a platform administrator. The role is served by
// GET /user/me (`role: 'GUEST' | 'USER' | 'ADMIN'`) — no JWT decoding needed.
// This gates admin-only UI for UX; the backend still enforces access and returns
// 403 on the admin endpoints regardless of what the client shows.
export function useIsAdmin(): boolean {
  const { user } = useUser();
  return user?.role === 'ADMIN';
}
