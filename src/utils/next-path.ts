/**
 * Narrows a `?next=` parameter to something safe to navigate to after sign-in.
 *
 * The value survives a round trip through the identity provider and comes back
 * in the URL, so it is attacker-controllable: only an in-app path is accepted,
 * never an absolute URL. `//evil.com` and `/\evil.com` are protocol-relative
 * addresses that browsers resolve to another origin, so they are rejected too.
 *
 * The path is locale-less (as produced by `usePathname` from
 * `@/i18n/navigation`) — the locale prefix is re-added on navigation.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

// A provider round trip can't carry `next`: user-api matches `redirect_to`
// exactly, so a query on it is dropped. It waits here instead — same tab, short-lived.
const NEXT_KEY = 'post_sign_in_next';
const NEXT_TTL_MS = 15 * 60 * 1000;

/** Called as a provider sign-in starts; null clears what an abandoned one left. */
export function rememberNextPath(next: string | null): void {
  try {
    if (next) sessionStorage.setItem(NEXT_KEY, JSON.stringify({ path: next, at: Date.now() }));
    else sessionStorage.removeItem(NEXT_KEY);
  } catch {
    // storage unavailable: the sign-in still lands on the dashboard
  }
}

/** Reads and clears it, once the sign-in has succeeded. */
export function takeRememberedNextPath(): string | null {
  try {
    const raw = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (typeof at !== 'number' || Date.now() - at > NEXT_TTL_MS) return null;
    return safeNextPath(path);
  } catch {
    return null;
  }
}
