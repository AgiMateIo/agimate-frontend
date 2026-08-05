import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { resolveLocale, routing } from '@/i18n/routing';
import { UserProvider } from '@/contexts/UserContext';
import { QueryProvider } from '@/contexts/QueryProvider';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';
import { getSiteOrigin, YANDEX_VERIFICATION } from '@/utils/seo';
import { Geist, Geist_Mono } from 'next/font/google';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requested } = await params;
  const locale = resolveLocale(requested);
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    // Inherited by every page below, so the relative canonical/hreflang paths and
    // any OG image resolve to absolute URLs. Deliberately no `alternates` here:
    // this layout also wraps /dashboard, which would then claim `/` as its
    // canonical.
    metadataBase: new URL(await getSiteOrigin()),
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
    // X reads og:image only once a card type is declared; without this the
    // generated card degrades to a thumbnail next to the title.
    twitter: { card: 'summary_large_image' },
    // Yandex checks the site root, which the locale middleware redirects to
    // /ru — so the tag has to live on every locale page, not on one of them.
    ...(YANDEX_VERIFICATION && { verification: { yandex: YANDEX_VERIFICATION } }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <UserProvider>{children}</UserProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        <YandexMetrika />
      </body>
    </html>
  );
}
