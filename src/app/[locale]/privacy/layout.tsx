import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';

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
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
