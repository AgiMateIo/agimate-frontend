import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { resolveLocale, routing } from '@/i18n/routing';
import { UserProvider } from '@/contexts/UserContext';
import { QueryProvider } from '@/contexts/QueryProvider';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';
import ReferralCapture from '@/components/referral/ReferralCapture';
import { getSiteOrigin, YANDEX_VERIFICATION } from '@/utils/seo';
import { brandFontVariables } from '@/app/fonts';
import { THEME_BOOT_SCRIPT, THEME_COLORS } from '@/utils/theme';
import '../globals.css';
import type { Viewport } from 'next';

// One theme-color per scheme, so the title bar of the installed app window and
// a phone's status bar match the page ground. The media queries only know the
// OS; `applyTheme` rewrites these tags when the person overrides it.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
};

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
    // iOS reads the manifest for most of this since 11.3, but the home-screen
    // label still comes from here, and it matches the manifest's short_name so
    // the icon is called the same thing on every platform.
    appleWebApp: { capable: true, title: 'AgiMate Web', statusBarStyle: 'default' },
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
    // `suppressHydrationWarning` belongs on <html> and only on <html>: the theme
    // boot script stamps data-theme here before React hydrates, so the attribute
    // is legitimately present in the DOM and absent from the server markup. This
    // silences that one comparison, not the subtree below it.
    // The font variables belong on <html>, not on <body> — see `@/app/fonts`.
    // `data-scroll-behavior` tells the router that the smooth scrolling declared
    // in globals.css is deliberate, so it can disable it during route changes.
    <html
      lang={locale}
      className={brandFontVariables}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Rendered by hand, and not through `app/manifest.ts`, because the file
            convention emits this link as part of the route's metadata — which
            Next re-renders on every client-side navigation, removing and
            re-inserting the element with the same href. Chrome reads that as the
            manifest URL changing and refetches it, reporting "manifest location
            changed during fetch" whenever a removal lands mid-fetch. Here the
            link belongs to the layout, which outlives every navigation inside a
            locale. */}
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="antialiased">
        {/* First thing in the body so the stored theme is on <html> before the
            first paint. A React effect would run after it, and the page would
            flash the OS theme on every load for anyone who overrode it.
            React logs a warning here about scripts inside components — it is
            accurate and harmless: this one only has work to do on a full page
            load, which is exactly when it runs. `next/script` with
            `beforeInteractive` silences the warning but does not emit an
            executable tag at all; it queues the source into `self.__next_s` for
            Next's runtime to eval later, which is after the first paint and
            brings the flash back. Measured, not assumed. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <UserProvider>{children}</UserProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        {/* An invite link can land on any page, and the code has to outlive the
            visit — it is only handed to the backend when sign-in starts. */}
        <ReferralCapture />
        <YandexMetrika />
      </body>
    </html>
  );
}
