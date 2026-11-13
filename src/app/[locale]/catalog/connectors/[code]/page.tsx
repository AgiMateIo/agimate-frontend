import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { Chip } from '@/components/ui/Chip';
import { CatalogBreadcrumb, CatalogSection } from '@/components/catalog/CatalogParts';
import { ConnectionCatalogCta } from '@/components/catalog/ConnectionCatalogCta';
import { ServiceIcon } from '@/components/catalog/ConnectorPresetCards';
import {
  CATALOG_AUTH_LABEL,
  CATALOG_AVAILABILITY_LABEL,
} from '@/components/catalog/connectorPresetLabels';
import {
  fetchCatalogConnectorPreset,
  fetchCatalogTaxonomy,
} from '@/services/server/publicCatalog';
import { availableLocales, catalogAlternates } from '@/utils/catalog-seo';
import { makeRegionLabel } from '@/utils/region';
import { taxonomyLabelLookup } from '@/utils/taxonomy';
import { parseHttpsUrl } from '@/utils/mcp-view';

type Params = Promise<{ locale: string; code: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: requested, code } = await params;
  const locale = resolveLocale(requested);
  const preset = await fetchCatalogConnectorPreset(code, locale);
  if (!preset) return {};
  const t = await getTranslations({ locale, namespace: 'CatalogPage' });
  const title = t('connector.metaTitle', { title: preset.card.name });
  const path = `/catalog/connectors/${encodeURIComponent(code)}`;
  return {
    title,
    description: preset.card.description ?? undefined,
    alternates: catalogAlternates(
      path,
      locale,
      await availableLocales(locale, (l) => fetchCatalogConnectorPreset(code, l)),
    ),
    openGraph: {
      title,
      description: preset.card.description ?? undefined,
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default async function CatalogConnectorPage({ params }: { params: Params }) {
  const { locale: requested, code } = await params;
  const locale = resolveLocale(requested);
  const [preset, taxonomy, t, tc] = await Promise.all([
    fetchCatalogConnectorPreset(code, locale),
    fetchCatalogTaxonomy(locale),
    getTranslations({ locale, namespace: 'CatalogPage' }),
    getTranslations({ locale, namespace: 'CatalogPage.connector' }),
  ]);
  if (!preset) notFound();

  const labels = taxonomyLabelLookup(taxonomy);
  const regionLabel = makeRegionLabel(locale);
  const { card, connection } = preset;
  const available = connection.availability === 'AVAILABLE';
  // A hint, not a promise: the live probe at creation has the final word.
  const availabilityLabel =
    connection.availability === 'AVAILABLE'
      ? null
      : tc(CATALOG_AVAILABILITY_LABEL[connection.availability]);
  const docsUrl = parseHttpsUrl(card.docsUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <CatalogBreadcrumb
        parentHref="/catalog/connectors"
        parentLabel={t('nav.connectors')}
        current={card.name}
      />

      <header className="mb-10">
        <div className="mb-5 flex items-center gap-4">
          <ServiceIcon name={card.name} iconUrl={card.iconUrl} size="lg" />
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {card.name}
          </h1>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-1">
          <Chip tone="accent">{tc('label')}</Chip>
          <Chip>{tc(CATALOG_AUTH_LABEL[card.auth])}</Chip>
          <Chip>{labels.categoryLabel(card.category)}</Chip>
          {card.jurisdiction && <Chip>{regionLabel(card.jurisdiction)}</Chip>}
        </div>
        {card.description && (
          <p className="mb-8 whitespace-pre-line text-lg leading-relaxed text-muted">
            {card.description}
          </p>
        )}
        {docsUrl && (
          <div className="mb-8">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent hover:underline"
            >
              {tc('docsLink')}
            </a>
          </div>
        )}

        {available ? (
          <ConnectionCatalogCta code={preset.code} />
        ) : (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {tc('unavailable', { reason: availabilityLabel ?? '' })}
          </p>
        )}
      </header>

      {available && (
        <CatalogSection title={tc('howItWorksTitle')}>
          <p className="text-sm leading-relaxed text-muted">{tc('howItWorksText')}</p>
        </CatalogSection>
      )}
    </div>
  );
}
