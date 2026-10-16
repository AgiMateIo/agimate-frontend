import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { PUBLIC_PAGES, getSiteOrigin } from '@/utils/seo';
import { fetchCatalogPresets, fetchCatalogSkills } from '@/services/server/publicCatalog';

// The origin comes from the request unless APP_PUBLIC_HOST pins it, so the same
// image cannot ship a sitemap full of another deployment's URLs.
export const dynamic = 'force-dynamic';

type Locale = (typeof routing.locales)[number];

// Catalog entries exist per language, so each one lists only the locales that
// have the same name — a translation link to a 404 breaks the hreflang cluster.
// A backend that does not answer costs the catalog entries, never the sitemap.
async function catalogEntries(origin: string): Promise<MetadataRoute.Sitemap> {
    const namesByLocale = await Promise.all(
        routing.locales.map(async (locale) => {
            const [presets, skills] = await Promise.all([
                fetchCatalogPresets(locale).catch(() => []),
                fetchCatalogSkills(locale).catch(() => []),
            ]);
            return {
                locale,
                paths: [
                    ...presets.map((p) => `/catalog/agents/${encodeURIComponent(p.name)}`),
                    ...skills.map((s) => `/catalog/skills/${encodeURIComponent(s.name)}`),
                ],
            };
        }),
    );

    const localesByPath = new Map<string, Locale[]>();
    for (const { locale, paths } of namesByLocale) {
        for (const path of paths) localesByPath.set(path, [...(localesByPath.get(path) ?? []), locale]);
    }

    return [...localesByPath].flatMap(([path, locales]) => {
        const languages = {
            ...Object.fromEntries(locales.map((code) => [code, `${origin}/${code}${path}`])),
            ...(locales.includes(routing.defaultLocale) && {
                'x-default': `${origin}/${routing.defaultLocale}${path}`,
            }),
        };
        return locales.map((locale) => ({
            url: `${origin}/${locale}${path}`,
            priority: 0.7,
            changeFrequency: 'weekly' as const,
            alternates: { languages },
        }));
    });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const origin = await getSiteOrigin();

    // One entry per locale per page, each carrying the full translation set —
    // the sitemap and the <link rel="alternate"> tags have to agree, or the
    // hreflang cluster is dropped as one-sided.
    const pages = PUBLIC_PAGES.flatMap(({ path, priority, changeFrequency }) => {
        const languages = {
            ...Object.fromEntries(routing.locales.map((code) => [code, `${origin}/${code}${path}`])),
            'x-default': `${origin}/${routing.defaultLocale}${path}`,
        };

        return routing.locales.map((locale) => ({
            url: `${origin}/${locale}${path}`,
            priority,
            changeFrequency,
            alternates: { languages },
        }));
    });

    return [...pages, ...(await catalogEntries(origin))];
}
