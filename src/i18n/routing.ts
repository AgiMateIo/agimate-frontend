import { hasLocale } from 'next-intl';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'always',
});

// Narrows a raw route param to a supported locale (falls back to the default).
export function resolveLocale(requested: string) {
  return hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
}

export const localeMap: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
};
