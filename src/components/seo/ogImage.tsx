import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { theme } from '@/generated/tokens';

// satori has no stylesheet in scope, so every colour here is read from the
// generated tokens instead of the CSS custom properties. A card is always dark.
const D = theme.dark;

/** `#rrggbb` plus an alpha -> `rgba(...)`, so a tint stays tied to its token. */
function withAlpha(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Facebook/Telegram/X all crop to this ratio; anything else gets letterboxed. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

// IBM Plex Sans, full unsubsetted TTFs checked into the repo rather than pulled
// from a CDN: rendering happens on the server on every crawler request, and a
// font fetch that fails would silently produce a card of tofu boxes. satori reads
// TTF/OTF, never woff2, so this cannot be the same file next/font serves to the
// browser — these two must be replaced by hand whenever the typeface changes.
//
// They live in public/ because that is the one directory the Dockerfile copies
// into the standalone image; bundling them next to this file would resolve to a
// /_next/static/media URL that no server-side read can follow. Read once and
// memoised — the cards are generated per request.
const FONT_DIR = join(process.cwd(), 'public', 'fonts');
const regular = readFile(join(FONT_DIR, 'IBMPlexSans-Regular.ttf'));
const semiBold = readFile(join(FONT_DIR, 'IBMPlexSans-SemiBold.ttf'));

// public/logo-mark.svg with the facet ramp inlined — satori resolves neither
// external files nor the stylesheet's prefers-color-scheme, and a card is always
// dark here. Because the ground is known, this is the one place that can carry
// the file's exact dark pair (teal-300 into teal-500) instead of deriving the
// second end from the first the way Logo.tsx has to. One objectBoundingBox
// gradient serves all four shapes, so each is faceted across its own box.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3.67 -0.06 72.66 66.09"><defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${D['mark-ink-light']}"/><stop offset="1" stop-color="${D['mark-ink']}"/></linearGradient></defs><path fill="url(#f)" d="M5.57 20.82 A6.5 6.5 0 0 1 5.57 11.63 L6.38 10.82 A6.5 6.5 0 0 1 15.57 10.82 L35.4 30.65 A6.5 6.5 0 0 0 44.6 30.65 L64.43 10.82 A6.5 6.5 0 0 1 73.62 10.82 L74.43 11.63 A6.5 6.5 0 0 1 74.43 20.82 L44.6 50.65 A6.5 6.5 0 0 1 35.4 50.65 Z"/><path fill="url(#f)" d="M35.4 1.85 A6.5 6.5 0 0 1 44.6 1.85 L49.9 7.15 A6.5 6.5 0 0 1 49.9 16.35 L44.6 21.65 A6.5 6.5 0 0 1 35.4 21.65 L30.1 16.35 A6.5 6.5 0 0 1 30.1 7.15 Z"/><path fill="url(#f)" d="M10.88 44.32 A6.5 6.5 0 0 1 20.07 44.32 L25.38 49.63 A6.5 6.5 0 0 1 25.38 58.82 L20.07 64.13 A6.5 6.5 0 0 1 10.88 64.13 L5.57 58.82 A6.5 6.5 0 0 1 5.57 49.63 Z"/><path fill="url(#f)" d="M59.93 44.32 A6.5 6.5 0 0 1 69.12 44.32 L74.43 49.63 A6.5 6.5 0 0 1 74.43 58.82 L69.12 64.13 A6.5 6.5 0 0 1 59.93 64.13 L54.62 58.82 A6.5 6.5 0 0 1 54.62 49.63 Z"/></svg>`;
const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;

/**
 * The share card behind every `opengraph-image.tsx`. Colours are the dark theme
 * of globals.css verbatim — a share card has no `prefers-color-scheme` to follow,
 * and dark is the product's default.
 */
export async function renderOgImage({ title, description }: { title: string; description: string }) {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '72px 80px',
                    backgroundColor: D.background,
                    // Warm surface tint plus an accent bloom behind the wordmark, so
                    // the card is not a flat rectangle at thumbnail size.
                    backgroundImage:
                        `radial-gradient(900px 500px at 88% -8%, ${withAlpha(D.accent, 0.28)}, transparent 62%),` +
                        `radial-gradient(700px 460px at 4% 108%, ${withAlpha(D.surface, 0.95)}, transparent 70%)`,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img> only */}
                    <img src={MARK_DATA_URI} width={54} height={49} alt="" />
                    <div style={{ fontSize: 34, fontWeight: 600, color: D.foreground, letterSpacing: -0.5 }}>
                        AgiMate
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            fontSize: 62,
                            fontWeight: 600,
                            lineHeight: 1.1,
                            letterSpacing: -1.5,
                            color: D.foreground,
                        }}
                    >
                        {title}
                    </div>
                    <div style={{ marginTop: 28, fontSize: 27, lineHeight: 1.4, color: D.muted }}>
                        {description}
                    </div>
                </div>

                <div style={{ display: 'flex', height: 6, borderRadius: 3, backgroundColor: D.accent, width: 148 }} />
            </div>
        ),
        {
            ...OG_IMAGE_SIZE,
            fonts: [
                { name: 'IBM Plex Sans', data: await regular, weight: 400, style: 'normal' },
                { name: 'IBM Plex Sans', data: await semiBold, weight: 600, style: 'normal' },
            ],
        },
    );
}
