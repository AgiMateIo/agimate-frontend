import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

/**
 * The public, indexable pages, as locale-less paths. Single source for the
 * sitemap and for the hreflang sets — a page added here appears in both, a page
 * missing here is one search engines never learn about.
 */
export const PUBLIC_PAGES = [
    // The home page keeps its title and description at the root of `Metadata`;
    // every other page nests them under `meta`, hence the prefix.
    { path: '', namespace: 'Metadata', metaPrefix: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/n8n', namespace: 'N8nPage', metaPrefix: 'meta.', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/desktop', namespace: 'DesktopPage', metaPrefix: 'meta.', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/android', namespace: 'AndroidPage', metaPrefix: 'meta.', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/privacy', namespace: 'Privacy', metaPrefix: 'meta.', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', namespace: 'Terms', metaPrefix: 'meta.', priority: 0.3, changeFrequency: 'yearly' },
] as const satisfies ReadonlyArray<{
    path: string;
    namespace: string;
    metaPrefix: '' | 'meta.';
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
}>;

/**
 * The one host that owns the canonical URLs, without a scheme or `www.`.
 * Unset on local development, and optional on a deployment that only ever
 * answers on a single hostname.
 */
export const CANONICAL_HOST = process.env.APP_PUBLIC_HOST?.trim().replace(/^www\./, '');

/** The hostname this request arrived on, without a port or `www.`. */
export async function getRequestHost(): Promise<string> {
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? '';
    return host.split(':')[0].replace(/^www\./, '');
}

/**
 * Absolute origin for canonical links, hreflang and the sitemap.
 *
 * `APP_PUBLIC_HOST` wins when set, so a request that arrives on `www.` or on a
 * secondary domain still points search engines at the one canonical address.
 * Without it the origin is read off the request, matching how `getApiBaseUrl()`
 * derives the gateway — a deployment needs no build-time configuration.
 */
export async function getSiteOrigin(): Promise<string> {
    if (CANONICAL_HOST) return `https://${CANONICAL_HOST}`;

    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
    const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${protocol}://${host}`;
}

/**
 * `canonical` + `hreflang` for one public page. Paths stay relative: Next
 * resolves them against the `metadataBase` set in the locale layout.
 *
 * Every locale of a page lists the whole set, itself included — that is what
 * tells a search engine the ru and en versions are translations rather than
 * duplicates. Keys are bare language codes, not the `ru-RU`/`en-US` of
 * `localeMap`: a region suffix would narrow the page to visitors in that
 * country, and the audience is the language, not the country.
 */
export function buildAlternates(locale: string, path: string) {
    return {
        canonical: `/${locale}${path}`,
        languages: {
            ...Object.fromEntries(routing.locales.map((code) => [code, `/${code}${path}`])),
            'x-default': `/${routing.defaultLocale}${path}`,
        },
    };
}
