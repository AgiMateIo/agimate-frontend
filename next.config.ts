import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    output: 'standalone',
    async redirects() {
        return [
            { source: '/dashboard/apps', destination: '/dashboard/connectors', permanent: true },
            { source: '/dashboard/apps/:id', destination: '/dashboard/connectors/:id', permanent: true },
        ];
    },
};

export default withNextIntl(nextConfig);
