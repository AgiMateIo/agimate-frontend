import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';

// One landing shell for the index, the entity pages and their 404.
export default async function CatalogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: requested } = await params;
  const t = await getTranslations({ locale: resolveLocale(requested), namespace: 'CatalogPage' });

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <LandingBackground />
      <LandingHeader
        navLinks={[
          { href: '/catalog/agents', label: t('nav.agents'), internal: true, priority: true },
          { href: '/catalog/skills', label: t('nav.skills'), internal: true, priority: true },
        ]}
        loginLabel={t('nav.login')}
        dashboardLabel={t('nav.dashboard')}
      />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
