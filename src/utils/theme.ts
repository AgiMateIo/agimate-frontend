import { createPersistentValue } from '@/utils/persistentValue';

/**
 * Colour theme preference.
 *
 * Three states, not two. `system` is the absence of a choice: nothing is stamped
 * on <html>, the stylesheet's `prefers-color-scheme` block decides, and the page
 * behaves exactly as it did before a switcher existed. That is also why `system`
 * serialises to `null` — it removes the key rather than storing a word, so a
 * reader who never touches the control leaves no trace and keeps following the OS
 * even if the default here ever changes.
 *
 * The attribute, the storage key and the inline script in the locale layout have
 * to agree; the key is exported so the script cannot drift from this file.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ui:theme';
export const THEME_CHANGE_EVENT = 'ui:theme-change';

export const themeStore = createPersistentValue<ThemePreference>({
  key: THEME_STORAGE_KEY,
  event: THEME_CHANGE_EVENT,
  fallback: 'system',
  parse: (raw) => (raw === 'light' || raw === 'dark' ? raw : null),
  serialize: (theme) => (theme === 'system' ? null : theme),
});

/** Mirrors the preference onto <html>, which is what the stylesheet reads. */
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/**
 * Runs before the page paints, so the first frame is already in the right theme.
 * Stringified into the document by the locale layout: it cannot import anything,
 * and it must not throw when site data is blocked — a preference is not worth a
 * blank page.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
