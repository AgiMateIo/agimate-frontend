/**
 * The catalog preset a visitor chose before they had an account.
 *
 * `?preset=` rides into /register and /login, but the confirmation letter opens
 * a fresh tab without it, so the name waits in localStorage (like `?ref=`) and
 * the dashboard takes it once a session exists. A day is enough to open a
 * letter; past that the choice is stale and the dashboard opens as usual.
 */

const STORAGE_KEY = 'catalog:preset';
const TTL_MS = 24 * 60 * 60 * 1000;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isPresetName(value: string | null | undefined): value is string {
  return !!value && NAME_PATTERN.test(value);
}

export function rememberPendingPreset(name: string): void {
  if (typeof window === 'undefined' || !isPresetName(name)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, at: Date.now() }));
  } catch {
    // Storage blocked: the visitor picks the preset again in the wizard.
  }
}

/** The remembered preset, removed on read — it is acted on once. */
export function takePendingPreset(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    const { name, at } = JSON.parse(raw) as { name?: unknown; at?: unknown };
    if (typeof name !== 'string' || !isPresetName(name)) return null;
    if (typeof at !== 'number' || Date.now() - at > TTL_MS) return null;
    return name;
  } catch {
    return null;
  }
}
