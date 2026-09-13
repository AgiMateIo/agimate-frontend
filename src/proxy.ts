import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { primaryRedirectTarget } from './utils/primary-origin';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Before the locale redirect, so a locale-less `/login?token=…` from an old
  // letter moves hosts in one hop and the primary host adds the locale itself.
  // The host comes from the headers, not from `request.url`: behind the reverse
  // proxy the standalone server sees its own bind address there.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const target = primaryRedirectTarget(host, request.nextUrl.pathname, request.nextUrl.search);
  // 307, never permanent: browsers cache a 301/308 with no way to take it back.
  if (target) return NextResponse.redirect(target, 307);

  return intlMiddleware(request);
}

// `app/auth` is the Android App Link return address and has to answer on that
// exact path: the backend matches it against its redirect allow-list byte for
// byte, and a locale redirect would write the single-use credentials in its
// query into a second access-log line before the page ever renders. It stays on
// `www.agimate.io` for the same reason — no web session lives there to move.
// Paths with a dot are skipped already, which covers /.well-known/assetlinks.json,
// the MCP OAuth client document, robots.txt, the sitemap and the manifest.
export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|app/auth|.*\\..*).*)',
};
