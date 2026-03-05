import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    output: 'standalone',
    async redirects() {
        return [
            { source: '/dashboard/connectors', destination: '/dashboard/apps', permanent: true },
            { source: '/dashboard/connectors/:id', destination: '/dashboard/apps/:id', permanent: true },
        ];
    },
};

export default withNextIntl(nextConfig);
