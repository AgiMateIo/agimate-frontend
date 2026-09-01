import { hasLocale, type Locale } from 'next-intl';
import { headers } from 'next/headers';
import { resolveLocale, routing } from '@/i18n/routing';

/**
 * The visitor's language, read off `Accept-Language`.
 *
 * This route lives outside `[locale]` (see the layout for why), so there is no
 * prefix in the URL to take the locale from and no next-intl middleware to
 * negotiate one. The address is fixed — the Android app's App Link return
 * address is matched byte for byte on the backend — so the language has to come
 * from the request instead.
 *
 * Unknown or missing header falls back to the site's default, ru.
 */
export async function resolveHeaderLocale(): Promise<Locale> {
  const header = (await headers()).get('accept-language') ?? '';

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(';');
      const quality = parameters.find((parameter) => parameter.trim().startsWith('q='));
      return {
        // `ru-RU` and `ru` are the same language to us: the site has no regional
        // variants, and matching the full tag would drop every visitor whose
        // browser is specific about its region.
        language: tag.split('-')[0].toLowerCase(),
        quality: quality ? Number.parseFloat(quality.split('=')[1]) : 1,
      };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0)
    .sort((a, b) => b.quality - a.quality);

  // `resolveLocale` only narrows the type here — the `hasLocale` check above is
  // what decides, and its fallback is the same default.
  return resolveLocale(
    ranked.find(({ language }) => hasLocale(routing.locales, language))?.language ??
      routing.defaultLocale,
  );
}
