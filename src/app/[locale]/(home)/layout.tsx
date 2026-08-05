import { getTranslations } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import { buildAlternates, getSiteOrigin } from '@/utils/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildHomeGraph } from '@/components/seo/graph';

// The home page itself is a client component and cannot export metadata, and the
// locale layout above wraps the dashboard too — so canonical/hreflang for `/` get
// their own layout in a route group, which leaves the URL untouched.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale: requested } = await params;
    // Title and description stay in the locale layout: they describe the product,
    // and the home page is what that description is about.
    return { alternates: buildAlternates(resolveLocale(requested), '') };
}

export default async function HomeLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale: requested } = await params;
    const locale = resolveLocale(requested);
    const t = await getTranslations({ locale, namespace: 'Metadata' });

    return (
        <>
            <JsonLd
                data={buildHomeGraph({
                    origin: await getSiteOrigin(),
                    locale,
                    name: t('title'),
                    description: t('description'),
                })}
            />
            {children}
        </>
    );
}
