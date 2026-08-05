import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { buildAlternates } from '@/utils/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const t = await getTranslations({ locale, namespace: 'AndroidPage' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: buildAlternates(locale, '/android'),
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDescription'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default function AndroidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
