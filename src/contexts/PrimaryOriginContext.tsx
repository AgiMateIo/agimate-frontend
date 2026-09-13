'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { getPathname } from '@/i18n/navigation';
import { currentReferralCode } from '@/utils/referral';

/**
 * The deployment's primary origin (`APP_PUBLIC_ORIGIN`), handed down from the
 * locale layout — the variable is server-side and read per request, so it cannot
 * be inlined into the bundle. Null where it is unset.
 */
const PrimaryOriginContext = createContext<string | null>(null);

export function PrimaryOriginProvider({ origin, children }: { origin: string | null; children: ReactNode }) {
  return <PrimaryOriginContext.Provider value={origin}>{children}</PrimaryOriginContext.Provider>;
}

const subscribe = () => () => {};
const getHostSnapshot = () => window.location.hostname;
const getHostServerSnapshot = (): string | null => null;
const getReferralServerSnapshot = (): string | null => null;

/**
 * Href for the landing's "sign in" and "dashboard" buttons.
 *
 * On the primary host — and during SSR, before the host is known — it is the
 * plain in-app path. Anywhere else it points straight at the primary address,
 * and a sign-in link carries the referral code along: the code is remembered in
 * this host's storage, which the primary address cannot read. A relative link
 * would still get there through the proxy's redirect, one hop later and without
 * the code.
 */
export function usePrimaryHref(path: '/login' | '/dashboard'): string {
  const origin = useContext(PrimaryOriginContext);
  const locale = useLocale();
  const host = useSyncExternalStore(subscribe, getHostSnapshot, getHostServerSnapshot);
  const referral = useSyncExternalStore(subscribe, currentReferralCode, getReferralServerSnapshot);

  if (!origin || !host || host === new URL(origin).hostname) return path;

  const query = path === '/login' && referral ? `?ref=${referral}` : '';
  return `${origin}${getPathname({ href: path, locale })}${query}`;
}
