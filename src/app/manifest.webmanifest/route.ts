import type { MetadataRoute } from 'next';
import { theme } from '@/generated/tokens';

// The Web App Manifest — what makes the dashboard installable. Served from a
// route handler rather than `app/manifest.ts`, and the difference is not
// cosmetic: the file convention makes Next emit the `<link rel="manifest">` as
// part of the route's *metadata*, and metadata is re-rendered on every
// client-side navigation — the element is removed and re-inserted with the same
// href. Chrome reads that as the manifest URL changing, refetches on every
// in-app navigation, and reports "manifest location changed during fetch" when
// a removal lands while a fetch is in flight. A dashboard navigates constantly,
// so that was permanent. The `<link>` now lives in the locale layout's <head>,
// inside the persistent layout tree, and never unmounts.
//
// The dotted path keeps this out of the locale proxy (matcher skips paths with
// a dot), same as /connections/oauth/client.json.
//
// Locale-less on purpose. `start_url` has no prefix because the proxy redirects
// it to the visitor's own locale, and a redirect inside the scope is fine with
// Chrome; the scope is `/` rather than `/dashboard` because with
// `localePrefix: 'always'` every page lives under /ru or /en and a /dashboard
// scope would match none of them. One manifest for both languages, so the copy
// is the brand name and an English line — Chrome only shows the description in
// the richer install sheet, which needs `screenshots` we do not ship yet.
//
// `short_name` is deliberately not "AgiMate": the Android and desktop clients
// already own that launcher label, and two icons with one name is a coin toss.
//
// Icons are rendered from public/logo-tile.svg (the dark-scheme colours — a
// rasteriser has no colour scheme, and the icon has one look). The maskable
// variant is the same tile with the mark at 56% of the side instead of 68%, so
// the outer diamonds stay inside the 80% circle Android may crop to. Keep the
// `any` and `maskable` entries separate: one icon declared as both is drawn
// with the maskable padding everywhere, which is too much air in a tab strip.
//
// No service worker, and not by oversight: the install button no longer needs
// one, and four of our routes carry single-use credentials in the URL
// (/login-check, /app/auth, the MCP OAuth callback, settings?link_proof=), so any
// cached navigation is a replayed proof. Every merge to main deploys, too, so a
// precache would mostly show "reload to update".

// Nothing here is read off the request, so it is baked at build time.
export const dynamic = 'force-static';

function manifest(): MetadataRoute.Manifest {
    return {
        id: '/dashboard',
        name: 'AgiMate Dashboard',
        short_name: 'AgiMate Web',
        description: 'Agents, skills, connections and chats of your AgiMate platform.',
        // utm_source marks the launches in Metrika; `ref` is off limits here, it
        // is the invite code ReferralCapture reads.
        start_url: '/dashboard?utm_source=pwa',
        scope: '/',
        display: 'standalone',
        // The dark scheme is the design's base (tokens.css starts from it); the
        // splash uses this before the page can read the preference, and the
        // <meta name="theme-color"> tags in the locale layout take over per scheme.
        background_color: theme.dark.background,
        theme_color: theme.dark.background,
        lang: 'en',
        dir: 'ltr',
        categories: ['productivity', 'developer tools'],
        prefer_related_applications: false,
        // A second click on the launcher focuses the open window instead of
        // opening another one — a dashboard is not a document.
        launch_handler: { client_mode: 'navigate-existing' },
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}

export function GET() {
    return Response.json(manifest(), {
        headers: {
            // The manifest MIME type. Chrome accepts application/json too, but
            // a wrong type is one of the few things that makes it refuse the
            // document outright.
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=0, must-revalidate',
        },
    });
}
