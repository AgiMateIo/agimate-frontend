import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { buildAlternates } from '@/utils/seo';
import { CatalogHero } from '@/components/catalog/CatalogParts';
import { ConnectorCatalogBrowser } from '@/components/catalog/ConnectorCatalogBrowser';
import {
  fetchCatalogConnectorPresets,
  fetchCatalogTaxonomy,
} from '@/services/server/publicCatalog';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const t = await getTranslations({ locale, namespace: 'CatalogPage.connectorsIndex' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: buildAlternates(locale, '/catalog/connectors'),
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDescription'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default async function CatalogConnectorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const [t, presets, taxonomy] = await Promise.all([
    getTranslations({ locale, namespace: 'CatalogPage' }),
    fetchCatalogConnectorPresets(locale),
    fetchCatalogTaxonomy(locale),
  ]);

  return (
    <>
      <CatalogHero
        active="connectors"
        title={t('connectorsIndex.title')}
        subtitle={t('connectorsIndex.subtitle')}
        tabs={{
          label: t('tabsLabel'),
          agents: t('nav.agents'),
          skills: t('nav.skills'),
          connectors: t('nav.connectors'),
        }}
      />
      <ConnectorCatalogBrowser items={presets} taxonomy={taxonomy} />
    </>
  );
}
