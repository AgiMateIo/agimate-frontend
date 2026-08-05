/**
 * The structured-data graph for the home page.
 *
 * Every claim here has to be one the page itself makes — schema.org markup that
 * contradicts the visible copy is a manual-action risk, and an answer engine that
 * quotes it is quoting us. Notably absent: `offers`. The landing says "start for
 * free", which is not the same as the product being free, and a `price: 0` would
 * assert the stronger claim.
 */
export function buildHomeGraph({
    origin,
    locale,
    name,
    description,
}: {
    origin: string;
    locale: string;
    name: string;
    description: string;
}) {
    const organizationId = `${origin}/#organization`;

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': organizationId,
                name: 'AgiMate',
                url: origin,
                logo: `${origin}/logo-tile.svg`,
                sameAs: ['https://github.com/AgiMateIo', 'https://t.me/agimate'],
            },
            {
                '@type': 'WebSite',
                '@id': `${origin}/#website`,
                url: origin,
                name: 'AgiMate',
                description,
                inLanguage: locale,
                publisher: { '@id': organizationId },
            },
            {
                '@type': 'SoftwareApplication',
                '@id': `${origin}/#app`,
                name,
                description,
                url: `${origin}/${locale}`,
                applicationCategory: 'BusinessApplication',
                // Web is the dashboard; the rest are the clients the /desktop and
                // /android pages actually offer.
                operatingSystem: 'Web, Windows, macOS, Linux, Android',
                inLanguage: locale,
                publisher: { '@id': organizationId },
            },
        ],
    };
}
