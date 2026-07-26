'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';

// 'overview' — the friendly counters/onboarding home.
// 'pro'      — the dense working home (logs, schedules, problems).
export type DashboardViewMode = 'overview' | 'pro';

const STORAGE_KEY = 'dashboard:view-mode';
const CHANGE_EVENT = 'dashboard:view-mode-change';
const VIEW_PARAM = 'view';

const parseMode = (value: string | null): DashboardViewMode | null =>
  value === 'pro' || value === 'overview' ? value : null;

// Persisted mode as an external store, mirroring the sidebar collapse flag: no
// setState-in-effect, SSR-safe (the server always renders the overview), and
// synced across tabs.
const modeStore = {
  subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(CHANGE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  },
  getSnapshot: (): DashboardViewMode =>
    parseMode(localStorage.getItem(STORAGE_KEY)) ?? 'overview',
  getServerSnapshot: (): DashboardViewMode => 'overview',
  set(mode: DashboardViewMode) {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
};

/**
 * Dashboard view mode, persisted per browser.
 *
 * `?view=pro|overview` wins over the stored preference so a link can point at
 * one mode; switching then rewrites that param too, otherwise the URL would
 * keep overriding every click. Without the param the URL stays clean.
 */
export function useDashboardViewMode() {
  const stored = useSyncExternalStore(
    modeStore.subscribe,
    modeStore.getSnapshot,
    modeStore.getServerSnapshot,
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fromUrl = parseMode(searchParams.get(VIEW_PARAM));
  const mode = fromUrl ?? stored;

  const setMode = useCallback(
    (next: DashboardViewMode) => {
      modeStore.set(next);
      if (fromUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.set(VIEW_PARAM, next);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [fromUrl, pathname, router, searchParams],
  );

  return { mode, setMode };
}
