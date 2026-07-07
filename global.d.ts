import type { routing } from '@/i18n/routing';
import type baseMessages from './messages/en.json';
import type dashboardMessages from './messages/dashboard/en.json';

// Compile-time safety for translation keys: typos in useTranslations()
// namespaces or t() keys become tsc errors instead of runtime fallbacks.
// Messages are merged base + dashboard, mirroring src/i18n/request.ts.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof baseMessages & typeof dashboardMessages;
  }
}
