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
    // Local development is served from the `.lc` hosts, not from localhost, and
    // `next dev` refuses to hand `/_next/*` to anything it wasn't told about.
    // Up to Next 16.0 an unset `allowedDevOrigins` only logged a warning; from
    // 16.3 it answers 403, which blocks every client chunk — the page arrives as
    // server-rendered HTML and then never hydrates. Dev-only: production builds
    // ignore this field.
    allowedDevOrigins: ['agimate.lc', '*.agimate.lc'],
    // `@swc/helpers` exports `./_/*` with a `module-sync` condition pointing at
    // `esm/`, which Node >= 22.10 (the image runs 24) picks for a plain
    // `require`. Next's tracer follows the `default` -> `cjs/` branch instead,
    // so the standalone output ships without `esm/` and `server.js` dies on
    // startup with MODULE_NOT_FOUND — a build that succeeds and an image that
    // will not boot. Force the directory in until the tracer honours the
    // condition.
    outputFileTracingIncludes: {
        '**': ['node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/esm/**'],
    },
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
