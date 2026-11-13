/**
 * The catalog item a visitor chose before they had an account.
 *
 * `?preset=` rides into /register and /login, but the confirmation letter opens
 * a fresh tab without it, so the choice waits in localStorage (like `?ref=`)
 * and the dashboard takes it once a session exists. `kind` says what the choice
 * opens: an agent to create or a connection to prefill. A day is enough to open
 * a letter; past that the choice is stale and the dashboard opens as usual.
 *
 * Records written before `kind` existed hold just `{name, at}`; they are read
 * as agent presets, which is what the only catalog had at the time.
 */

const STORAGE_KEY = 'catalog:preset';
const TTL_MS = 24 * 60 * 60 * 1000;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export type PendingPresetKind = 'agent' | 'connection';

export interface PendingPreset {
  kind: PendingPresetKind;
  name: string;
}

export function isPresetName(value: string | null | undefined): value is string {
  return !!value && NAME_PATTERN.test(value);
}

export function isPendingPresetKind(value: unknown): value is PendingPresetKind {
  return value === 'agent' || value === 'connection';
}

export function rememberPendingPreset(kind: PendingPresetKind, name: string): void {
  if (typeof window === 'undefined' || !isPresetName(name)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ kind, name, at: Date.now() }));
  } catch {
    // Storage blocked: the visitor picks the item again in the catalog.
  }
}

/**
 * The remembered choice, removed on read — it is acted on once. With `kind`, a
 * record of the other kind stays in storage for the page that can act on it:
 * opening the agent wizard must not swallow a connection preset.
 */
export function takePendingPreset(kind?: PendingPresetKind): PendingPreset | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { kind: stored, name, at } = JSON.parse(raw) as {
      kind?: unknown;
      name?: unknown;
      at?: unknown;
    };
    const expired = typeof at !== 'number' || Date.now() - at > TTL_MS;
    if (typeof name !== 'string' || !isPresetName(name) || expired) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const storedKind: PendingPresetKind = isPendingPresetKind(stored) ? stored : 'agent';
    if (kind && storedKind !== kind) return null;
    localStorage.removeItem(STORAGE_KEY);
    return { kind: storedKind, name };
  } catch {
    return null;
  }
}
