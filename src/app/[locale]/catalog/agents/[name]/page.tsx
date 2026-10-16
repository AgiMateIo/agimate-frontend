import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';
import { Chip } from '@/components/ui/Chip';
import { TaxonomyLine } from '@/components/catalog/CatalogCards';
import { CatalogBreadcrumb, CatalogSection } from '@/components/catalog/CatalogParts';
import { CatalogCta } from '@/components/catalog/CatalogCta';
import { fetchCatalogPreset, fetchCatalogTaxonomy } from '@/services/server/publicCatalog';
import { availableLocales, catalogAlternates } from '@/utils/catalog-seo';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { catalogCategory, catalogTags, taxonomyLabelLookup } from '@/utils/taxonomy';

type Params = Promise<{ locale: string; name: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: requested, name } = await params;
  const locale = resolveLocale(requested);
  const preset = await fetchCatalogPreset(name, locale);
  if (!preset) return {};
  const t = await getTranslations({ locale, namespace: 'CatalogPage' });
  const title = t('preset.metaTitle', { title: preset.title });
  const path = `/catalog/agents/${encodeURIComponent(name)}`;
  return {
    title,
    description: preset.description ?? undefined,
    alternates: catalogAlternates(path, locale, await availableLocales(locale, (l) => fetchCatalogPreset(name, l))),
    openGraph: {
      title,
      description: preset.description ?? undefined,
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default async function CatalogPresetPage({ params }: { params: Params }) {
  const { locale: requested, name } = await params;
  const locale = resolveLocale(requested);
  const [preset, taxonomy, t] = await Promise.all([
    fetchCatalogPreset(name, locale),
    fetchCatalogTaxonomy(locale),
    getTranslations({ locale, namespace: 'CatalogPage' }),
  ]);
  if (!preset) notFound();
  const labels = taxonomyLabelLookup(taxonomy);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <CatalogBreadcrumb parentHref="/catalog/agents" parentLabel={t('nav.agents')} current={preset.title} />

      <header className="mb-10">
        <div className="mb-5 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI */}
          <img src={getAgentAvatarUrl(preset.name)} alt="" className="h-16 w-16 shrink-0 rounded-2xl" />
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{preset.title}</h1>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-1">
          {preset.agentType && <Chip tone="accent">{t('externalAgent')}</Chip>}
          <TaxonomyLine category={catalogCategory(preset)} tags={catalogTags(preset)} labels={labels} />
        </div>
        {preset.description && (
          <p className="mb-8 whitespace-pre-line text-lg leading-relaxed text-muted">{preset.description}</p>
        )}
        <CatalogCta presetName={preset.name} />
      </header>

      <div className="space-y-6">
        <CatalogSection title={t('preset.skillsTitle')}>
          {preset.skills.length === 0 ? (
            <p className="text-sm text-muted">{t('preset.noSkills')}</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {preset.skills.map((skill) => (
                <li key={skill.name} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/catalog/skills/${encodeURIComponent(skill.name)}`}
                    className="font-medium hover:text-accent transition-colors"
                  >
                    {skill.title}
                  </Link>
                  {skill.description && <p className="mt-1 text-sm leading-relaxed text-muted">{skill.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </CatalogSection>
      </div>
    </div>
  );
}
