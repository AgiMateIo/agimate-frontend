import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const t = await getTranslations({ locale, namespace: 'DesktopPage' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDescription'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
