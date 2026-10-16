import { routing } from '@/i18n/routing';

type Locale = (typeof routing.locales)[number];

/**
 * The locales a catalog entry exists in: the current one, plus every other
 * where `probe` found the same name. A preset is per language, so linking a
 * translation that 404s would hand search engines a broken hreflang pair.
 */
export async function availableLocales(
  locale: Locale,
  probe: (l: Locale) => Promise<unknown | null>,
): Promise<Locale[]> {
  const others = routing.locales.filter((l) => l !== locale);
  const found = await Promise.all(others.map(async (l) => ((await probe(l).catch(() => null)) ? l : null)));
  return [locale, ...found.filter((l): l is Locale => l !== null)];
}

/** `buildAlternates` narrowed to the locales the entry exists in. */
export function catalogAlternates(path: string, locale: Locale, availableIn: Locale[]) {
  const locales = routing.locales.filter((l) => l === locale || availableIn.includes(l));
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      ...(locales.includes(routing.defaultLocale) && {
        'x-default': `/${routing.defaultLocale}${path}`,
      }),
    },
  };
}
