'use client';

import { useCallback, useEffect } from 'react';
import { usePersistentValue } from '@/hooks/usePersistentValue';
import { applyTheme, themeStore, type ThemePreference } from '@/utils/theme';

/**
 * The theme preference and a setter that also repaints the page.
 *
 * The effect is not redundant with the setter: the store also fires on a
 * `storage` event, so switching the theme in one tab has to move the others.
 * Applying the same value twice is a no-op, so mounting this hook in more than
 * one place is harmless.
 */
export function useTheme() {
  const theme = usePersistentValue(themeStore);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    themeStore.set(next);
    applyTheme(next);
  }, []);

  return { theme, setTheme };
}
