'use client';

import { useUser } from '@/contexts/UserContext';

// Whether the current user's account is still awaiting activation. The role is
// served by GET /user/me (`role: 'GUEST' | 'USER' | 'ADMIN'`); GUEST means signed
// in but not yet granted access to the workspace. This gates the dashboard UI for
// UX only — the backend still rejects the API calls a guest cannot make.
export function useIsGuest(): boolean {
  const { user } = useUser();
  return user?.role === 'GUEST';
}
