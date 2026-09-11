import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { getDocTree } from '@/utils/docs';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import DocsNav from '@/components/docs/DocsNav';

/**
 * The documentation is public, so it wears the landing frame rather than the
 * dashboard's — the locale and theme switchers, the sign-in button and the
 * mobile menu all come with it.
 *
 * The sidebar lives here and not in the page on purpose: a layout survives a
 * navigation between its children, so the sections the reader unfolded stay
 * unfolded. The tree is read on the server and handed down as props; the nav
 * itself is a client component only because an accordion needs state.
 */
export default async function DocsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale: requested } = await params;
    const locale = resolveLocale(requested);
    const t = await getTranslations('HomePage');
    const sections = getDocTree(locale);

    return (
        // `min-h-screen` alone only stretches the wrapper: the footer still sits
        // directly under a short page, halfway up the window. The column plus a
        // growing main is what pins it to the bottom of the viewport.
        <div className="flex min-h-screen flex-col text-foreground">
            <LandingHeader
                navLinks={[]}
                loginLabel={t('nav.login')}
                dashboardLabel={t('nav.dashboard')}
            />

            {/* `max-w-6xl` is not a taste call: it is the container LandingHeader
                and LandingFooter use, and a wider one here makes the content
                overhang the header by 64px on each side on a wide window. The
                columns are sized to still leave the article its ~72ch inside it. */}
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
                <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
                    {/* Sticky rather than fixed, so the footer is reached by
                        scrolling past the column instead of the column covering it. */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                            <DocsNav sections={sections} />
                        </div>
                    </aside>

                    <div className="min-w-0">{children}</div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
