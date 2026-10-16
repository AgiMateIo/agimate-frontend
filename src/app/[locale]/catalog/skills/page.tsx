import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { buildAlternates } from '@/utils/seo';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { CatalogHero } from '@/components/catalog/CatalogParts';
import { fetchCatalogSkills, fetchCatalogTaxonomy } from '@/services/server/publicCatalog';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const t = await getTranslations({ locale, namespace: 'CatalogPage.skillsIndex' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: buildAlternates(locale, '/catalog/skills'),
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDescription'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
  };
}

export default async function CatalogSkillsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const [t, skills, taxonomy] = await Promise.all([
    getTranslations({ locale, namespace: 'CatalogPage' }),
    fetchCatalogSkills(locale),
    fetchCatalogTaxonomy(locale),
  ]);

  return (
    <>
      <CatalogHero
        active="skills"
        title={t('skillsIndex.title')}
        subtitle={t('skillsIndex.subtitle')}
        tabs={{ label: t('tabsLabel'), agents: t('nav.agents'), skills: t('nav.skills') }}
      />
      <CatalogBrowser kind="skills" items={skills} taxonomy={taxonomy} />
    </>
  );
}
