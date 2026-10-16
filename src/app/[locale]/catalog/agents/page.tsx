import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { buildAlternates } from '@/utils/seo';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { CatalogHero } from '@/components/catalog/CatalogParts';
import { fetchCatalogPresets, fetchCatalogTaxonomy } from '@/services/server/publicCatalog';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const t = await getTranslations({ locale, namespace: 'CatalogPage' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: buildAlternates(locale, '/catalog/agents'),
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDescription'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default async function CatalogAgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const [t, presets, taxonomy] = await Promise.all([
    getTranslations({ locale, namespace: 'CatalogPage' }),
    fetchCatalogPresets(locale),
    fetchCatalogTaxonomy(locale),
  ]);

  return (
    <>
      <CatalogHero
        active="agents"
        title={t('title')}
        subtitle={t('subtitle')}
        tabs={{ label: t('tabsLabel'), agents: t('nav.agents'), skills: t('nav.skills') }}
      />
      <CatalogBrowser kind="agents" items={presets} taxonomy={taxonomy} />
    </>
  );
}
