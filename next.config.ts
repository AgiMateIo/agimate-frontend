import { readFileSync } from 'node:fs';
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// package.json is the single source of the app version; it is baked into the
// client bundle at build time so the sidebar can show it.
const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

const nextConfig: NextConfig = {
    output: 'standalone',
    env: {
        NEXT_PUBLIC_APP_VERSION: version,
    },
    async redirects() {
        return [
            { source: '/dashboard/connectors', destination: '/dashboard/apps', permanent: true },
            { source: '/dashboard/connectors/:id', destination: '/dashboard/apps/:id', permanent: true },
        ];
    },
};

export default withNextIntl(nextConfig);
