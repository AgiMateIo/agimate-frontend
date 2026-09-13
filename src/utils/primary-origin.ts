import { routing } from '@/i18n/routing';

/**
 * The one address that holds sessions, and the redirect that keeps people on it.
 *
 * A session lives in storage bound to the exact host: `refresh_token_id` in
 * localStorage, the access token in sessionStorage. `agimate.io`, `www.agimate.io`
 * and `agimate.ru` are three different stores to the browser, so a sign-in made
 * on one is invisible on the others — and the return addresses the backend and
 * the MCP OAuth providers accept name `agimate.io` alone. Nothing moves a person
 * there by itself: a password sign-in has no redirect at all, and a provider
 * sign-in returns to the host that built `redirect_to`. So the move has to
 * happen before sign-in starts.
 */

/**
 * `APP_PUBLIC_ORIGIN` as an origin, or undefined when unset or unparseable.
 *
 * No default, unlike the MCP OAuth client document: the redirect switches on
 * only where a deployment names its primary address, so staging and local
 * development never start sending people to production.
 */
export function configuredPrimaryOrigin(): string | undefined {
  const raw = process.env.APP_PUBLIC_ORIGIN?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

// Everything that needs a session or runs a sign-in flow, as locale-less
// prefixes. `/connections` covers both the locale-prefixed deep links and the
// OAuth callback, whose `code`/`state` must reach the host that holds the session.
const PRIVATE_PREFIXES = [
  '/login',
  '/login-check',
  '/logout',
  '/register',
  '/password',
  '/dashboard',
  '/connections',
  '/llm-providers',
];

function isPrivatePath(pathname: string): boolean {
  const segments = pathname.split('/');
  const path = (routing.locales as readonly string[]).includes(segments[1])
    ? `/${segments.slice(2).join('/')}`
    : pathname;
  return PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Where a request has to go instead, or null when it is served where it is.
 *
 * `host` is the public host as the visitor typed it, port included or not.
 * `www.` of the primary host is only another spelling of it, so everything
 * moves; any other host (the `.ru` mirror) keeps its public pages and gives up
 * only the private ones. The path and the query travel intact: `?next=`, the
 * `?token=` of a confirmation letter and an OAuth `?code=&state=` are the flow
 * itself. Exclusions (`/app/auth`, `/.well-known`, static files) are the proxy
 * matcher's business and never reach this function.
 */
export function primaryRedirectTarget(
  host: string,
  pathname: string,
  search: string,
): string | null {
  const origin = configuredPrimaryOrigin();
  if (!origin) return null;

  const primaryHost = new URL(origin).hostname;
  const requestHost = host.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (!requestHost || requestHost === primaryHost) return null;
  if (requestHost !== `www.${primaryHost}` && !isPrivatePath(pathname)) return null;

  return `${origin}${pathname}${search}`;
}
