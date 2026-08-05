import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { CANONICAL_HOST, getRequestHost, getSiteOrigin } from '@/utils/seo';

// Read per request: the same image runs on production and on staging, and only
// the Host tells them apart. Never bake a domain in at build time.
export const dynamic = 'force-dynamic';

// Sections that require a session. Under /dashboard a crawler only ever sees the
// pre-auth skeleton, so indexing it costs crawl budget and gains nothing; /login,
// /login-check and /logout are one-shot flows whose URLs carry single-use state.
// Paths are locale-prefixed (localePrefix: 'always'), so each one is emitted per
// locale — plus the bare form, which the middleware only redirects. The bare
// /connections form also covers the MCP OAuth client document and callback; an
// OAuth provider fetching client.json does not consult robots.txt.
const PRIVATE_PATHS = ['/dashboard', '/login', '/login-check', '/logout', '/connections'];

export default async function robots(): Promise<MetadataRoute.Robots> {
    // APP_PUBLIC_HOST left unset means every host is indexable — that is the
    // behaviour of having no robots.txt at all, and failing the other way would
    // silently de-index production the moment the variable went missing.
    if (CANONICAL_HOST && (await getRequestHost()) !== CANONICAL_HOST) {
        // A staging or preview host must not compete with production for the
        // same content — one blanket rule, no exceptions to keep in sync.
        return { rules: { userAgent: '*', disallow: '/' } };
    }

    const disallow = [
        ...PRIVATE_PATHS,
        ...routing.locales.flatMap((locale) => PRIVATE_PATHS.map((path) => `/${locale}${path}`)),
    ];

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow,
        },
        sitemap: `${await getSiteOrigin()}/sitemap.xml`,
    };
}
