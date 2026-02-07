import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'always',
});

export const localeMap: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
};
