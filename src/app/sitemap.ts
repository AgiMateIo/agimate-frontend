import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { PUBLIC_PAGES, getSiteOrigin } from '@/utils/seo';

// The origin comes from the request unless APP_PUBLIC_HOST pins it, so the same
// image cannot ship a sitemap full of another deployment's URLs.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const origin = await getSiteOrigin();

    // One entry per locale per page, each carrying the full translation set —
    // the sitemap and the <link rel="alternate"> tags have to agree, or the
    // hreflang cluster is dropped as one-sided.
    return PUBLIC_PAGES.flatMap(({ path, priority, changeFrequency }) => {
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
}
