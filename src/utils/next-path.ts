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
