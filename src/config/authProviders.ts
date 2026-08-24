// authProviders.ts
// Which OAuth providers this frontend offers, and where.
//
// The backend knows four (`google`, `yandex`, `github`, `vk`) and has no
// endpoint listing which ones an installation actually configured, so the list
// lives here. It is shared by the sign-in screen and the "ways in" card in
// settings: a provider you can sign in with is a provider you can link.

import type { OAuthProviderCode } from '@/types/auth';

export const OAUTH_PROVIDERS = ['github', 'google', 'yandex'] as const;

export type OfferedProvider = Extract<OAuthProviderCode, (typeof OAUTH_PROVIDERS)[number]>;

// Google is hidden on the .ru domain and offered everywhere else. An unknown
// origin (SSR, where a client component cannot see the host) counts as hidden:
// the button fades in after hydration elsewhere rather than flashing on .ru for
// a frame.
export function providersForOrigin(origin: string): OfferedProvider[] {
  let showGoogle = false;
  if (origin) {
    try {
      showGoogle = !new URL(origin).hostname.endsWith('.ru');
    } catch {
      showGoogle = false;
    }
  }
  return OAUTH_PROVIDERS.filter((p) => p !== 'google' || showGoogle);
}

// The methods list names providers in uppercase; every other place — the
// authorization URL, this module's own codes — uses lowercase.
export function providerCodeFromEnum(value: string | null): OfferedProvider | null {
  const code = (value ?? '').toLowerCase();
  return (OAUTH_PROVIDERS as readonly string[]).includes(code) ? (code as OfferedProvider) : null;
}
