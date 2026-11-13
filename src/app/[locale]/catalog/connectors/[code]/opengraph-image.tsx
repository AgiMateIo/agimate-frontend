import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from '@/components/seo/ogImage';
import { fetchCatalogConnectorPreset } from '@/services/server/publicCatalog';

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = 'AgiMate';

export default async function Image({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale: requested, code } = await params;
  const locale = resolveLocale(requested);
  const preset = await fetchCatalogConnectorPreset(code, locale).catch(() => null);
  if (preset) {
    return renderOgImage({
      title: preset.card.name,
      description: preset.card.description ?? '',
    });
  }
  const t = await getTranslations({ locale, namespace: 'CatalogPage' });
  return renderOgImage({ title: t('meta.ogTitle'), description: t('meta.ogDescription') });
}
