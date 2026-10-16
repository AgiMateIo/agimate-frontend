import { permanentRedirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';

// The catalog is two lists; the bare address opens the agents.
export default async function CatalogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect({ href: '/catalog/agents', locale: resolveLocale(locale) });
}
