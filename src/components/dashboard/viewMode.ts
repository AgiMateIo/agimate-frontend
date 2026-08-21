'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { usePersistentValue } from '@/hooks/usePersistentValue';
import { createPersistentValue } from '@/utils/persistentValue';

// 'overview' — the friendly counters/onboarding home.
// 'pro'      — the dense working home (logs, schedules, problems).
export type DashboardViewMode = 'overview' | 'pro';

const VIEW_PARAM = 'view';

const parseMode = (value: string | null): DashboardViewMode | null =>
  value === 'pro' || value === 'overview' ? value : null;

const modeStore = createPersistentValue<DashboardViewMode>({
  key: 'dashboard:view-mode',
  event: 'dashboard:view-mode-change',
  fallback: 'overview',
  parse: parseMode,
  serialize: (mode) => mode,
});

/**
 * Dashboard view mode, persisted per browser.
 *
 * `?view=pro|overview` wins over the stored preference so a link can point at
 * one mode; switching then rewrites that param too, otherwise the URL would
 * keep overriding every click. Without the param the URL stays clean.
 */
export function useDashboardViewMode() {
  const stored = usePersistentValue(modeStore);
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
