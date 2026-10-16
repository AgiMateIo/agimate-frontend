import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';
import { Chip } from '@/components/ui/Chip';
import { TaxonomyLine } from '@/components/catalog/CatalogCards';
import { CatalogBreadcrumb, CatalogSection, ConnectorList } from '@/components/catalog/CatalogParts';
import { fetchCatalogSkill, fetchCatalogTaxonomy } from '@/services/server/publicCatalog';
import { availableLocales, catalogAlternates } from '@/utils/catalog-seo';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { catalogCategory, catalogTags, taxonomyLabelLookup } from '@/utils/taxonomy';

type Params = Promise<{ locale: string; name: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: requested, name } = await params;
  const locale = resolveLocale(requested);
  const skill = await fetchCatalogSkill(name, locale);
  if (!skill) return {};
  const t = await getTranslations({ locale, namespace: 'CatalogPage' });
  const title = t('skill.metaTitle', { title: skill.title });
  const path = `/catalog/skills/${encodeURIComponent(name)}`;
  return {
    title,
    description: skill.description ?? undefined,
    alternates: catalogAlternates(path, locale, await availableLocales(locale, (l) => fetchCatalogSkill(name, l))),
    openGraph: {
      title,
      description: skill.description ?? undefined,
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

// No "create" button here: an agent is what gets created, and the presets that
// bundle this skill are the way to one.
export default async function CatalogSkillPage({ params }: { params: Params }) {
  const { locale: requested, name } = await params;
  const locale = resolveLocale(requested);
  const [skill, taxonomy, t] = await Promise.all([
    fetchCatalogSkill(name, locale),
    fetchCatalogTaxonomy(locale),
    getTranslations({ locale, namespace: 'CatalogPage' }),
  ]);
  if (!skill) notFound();
  const labels = taxonomyLabelLookup(taxonomy);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <CatalogBreadcrumb parentHref="/catalog/skills" parentLabel={t('nav.skills')} current={skill.title} />

      <header className="mb-10">
        <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{skill.title}</h1>
        <div className="mb-6 flex flex-wrap items-center gap-1">
          <Chip tone="accent">{t('skill.label')}</Chip>
          <TaxonomyLine category={catalogCategory(skill)} tags={catalogTags(skill)} labels={labels} />
        </div>
        {skill.description && (
          <p className="whitespace-pre-line text-lg leading-relaxed text-muted">{skill.description}</p>
        )}
      </header>

      <div className="space-y-6">
        <CatalogSection title={t('skill.presetsTitle')}>
          {skill.presets.length === 0 ? (
            <p className="text-sm text-muted">{t('skill.noPresets')}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {skill.presets.map((preset) => (
                <li key={preset.name}>
                  <Link
                    href={`/catalog/agents/${encodeURIComponent(preset.name)}`}
                    className="flex items-center gap-3 rounded-xl border border-border/50 p-3 font-medium transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI */}
                    <img src={getAgentAvatarUrl(preset.name)} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
                    {preset.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-muted">{t('skill.addHint')}</p>
        </CatalogSection>

        <CatalogSection title={t('skill.connectorsTitle')}>
          <ConnectorList connectors={skill.connectors} empty={t('skill.noConnectors')} />
        </CatalogSection>
      </div>
    </div>
  );
}
