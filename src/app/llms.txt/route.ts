import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { PUBLIC_PAGES, getSiteOrigin } from '@/utils/seo';

// Same reason as robots.txt and the sitemap: the origin belongs to the request,
// not to the build.
export const dynamic = 'force-dynamic';

const LANGUAGE_NAMES: Record<string, string> = { ru: 'Русский', en: 'English' };

/**
 * `/llms.txt` — the site in markdown, for the crawlers behind generative answers.
 *
 * Titles and descriptions are the pages' own `Metadata`/`meta` strings rather than
 * prose written here: a hand-maintained copy would drift, and the one thing worse
 * than no llms.txt is one describing a version of the product that no longer
 * exists. Adding a page to `PUBLIC_PAGES` is what puts it in this file.
 *
 * The middleware matcher skips dotted paths, so this answers without a locale
 * prefix — one file for the whole site, with a section per language.
 */
export async function GET() {
    const origin = await getSiteOrigin();
    const t = await getTranslations({ locale: routing.defaultLocale, namespace: 'Metadata' });

    const sections = await Promise.all(
        routing.locales.map(async (locale) => {
            const links = await Promise.all(
                PUBLIC_PAGES.map(async ({ path, namespace, metaPrefix }) => {
                    const page = await getTranslations({ locale, namespace });
                    const title = page(`${metaPrefix}title`);
                    const description = page(`${metaPrefix}description`);
                    return `- [${title}](${origin}/${locale}${path}): ${description}`;
                }),
            );
            return `## ${LANGUAGE_NAMES[locale] ?? locale}\n\n${links.join('\n')}`;
        }),
    );

    const body = [
        '# AgiMate',
        '',
        `> ${t('description')}`,
        '',
        'Платформа доступна на русском и английском: один и тот же набор страниц под префиксом',
        `\`/ru\` и \`/en\`. Всё за пределами этого файла — личный кабинет, требующий входа.`,
        '',
        ...sections,
        '',
    ].join('\n');

    return new Response(body, {
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
        },
    });
}
