import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from '@/components/seo/ogImage';
import { fetchCatalogSkill } from '@/services/server/publicCatalog';

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = 'AgiMate';

export default async function Image({ params }: { params: Promise<{ locale: string; name: string }> }) {
  const { locale: requested, name } = await params;
  const locale = resolveLocale(requested);
  const skill = await fetchCatalogSkill(name, locale).catch(() => null);
  if (skill) return renderOgImage({ title: skill.title, description: skill.description ?? '' });
  const t = await getTranslations({ locale, namespace: 'CatalogPage' });
  return renderOgImage({ title: t('meta.ogTitle'), description: t('meta.ogDescription') });
}
