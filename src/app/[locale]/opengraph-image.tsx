import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgImage } from '@/components/seo/ogImage';

// Inherited by every page that does not define its own — the home page and the
// legal pages included, and harmlessly by /dashboard, where a shared link should
// still show the product rather than nothing.
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = 'AgiMate';

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
    const { locale: requested } = await params;
    const t = await getTranslations({ locale: resolveLocale(requested), namespace: 'Metadata' });
    return renderOgImage({ title: t('ogTitle'), description: t('ogDescription') });
}
