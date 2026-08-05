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
  const t = await getTranslations({ locale, namespace: 'Privacy' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: buildAlternates(locale, '/privacy'),
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
