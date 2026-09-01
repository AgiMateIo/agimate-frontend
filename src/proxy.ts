import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

// `app/auth` is the Android App Link return address and has to answer on that
// exact path: the backend matches it against its redirect allow-list byte for
// byte, and a locale redirect would write the single-use credentials in its
// query into a second access-log line before the page ever renders. Paths with
// a dot are skipped already, which covers /.well-known/assetlinks.json.
export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|app/auth|.*\\..*).*)',
};
