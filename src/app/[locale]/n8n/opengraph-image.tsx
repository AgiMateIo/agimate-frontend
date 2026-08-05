import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from '@/components/seo/ogImage';

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = 'AgiMate';

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
    const { locale: requested } = await params;
    const t = await getTranslations({ locale: resolveLocale(requested), namespace: 'N8nPage' });
    return renderOgImage({ title: t('meta.ogTitle'), description: t('meta.ogDescription') });
}
