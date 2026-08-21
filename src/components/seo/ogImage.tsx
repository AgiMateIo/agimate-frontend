import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** Facebook/Telegram/X all crop to this ratio; anything else gets letterboxed. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

// Geist with a Cyrillic subset, checked into the repo rather than pulled from a
// CDN: rendering happens on the server on every crawler request, and a font fetch
// that fails would silently produce a card of tofu boxes. satori reads TTF/OTF,
// never woff2, so this cannot be the same file next/font serves to the browser.
//
// They live in public/ because that is the one directory the Dockerfile copies
// into the standalone image; bundling them next to this file would resolve to a
// /_next/static/media URL that no server-side read can follow. Read once and
// memoised — the cards are generated per request.
const FONT_DIR = join(process.cwd(), 'public', 'fonts');
const regular = readFile(join(FONT_DIR, 'Geist-Regular.ttf'));
const semiBold = readFile(join(FONT_DIR, 'Geist-SemiBold.ttf'));

// public/logo-mark.svg with both fills inlined — satori resolves neither external
// files nor the stylesheet's prefers-color-scheme, and a card is always dark here.
// Because the ground is known, this is the one place that can carry the file's
// exact dark pair (indigo-500 with indigo-300) instead of deriving the second
// ink from the first the way Logo.tsx has to.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4.57 -1.71 89.15 80.82"><path fill="#6366f1" d="M10.27 20.02 A2.5 2.5 0 0 1 10.27 16.48 L13.98 12.77 A2.5 2.5 0 0 1 17.52 12.77 L38.23 33.48 A2.5 2.5 0 0 0 41.77 33.48 L62.48 12.77 A2.5 2.5 0 0 1 66.02 12.77 L69.73 16.48 A2.5 2.5 0 0 1 69.73 20.02 L41.77 47.98 A2.5 2.5 0 0 1 38.23 47.98 Z M7.12 52.91 A2.5 2.5 0 0 1 10.66 52.91 L21.62 63.87 A2.5 2.5 0 0 1 21.62 67.41 L10.66 78.37 A2.5 2.5 0 0 1 7.12 78.37 L-3.84 67.41 A2.5 2.5 0 0 1 -3.84 63.87 Z M69.34 52.91 A2.5 2.5 0 0 1 72.88 52.91 L83.84 63.87 A2.5 2.5 0 0 1 83.84 67.41 L72.88 78.37 A2.5 2.5 0 0 1 69.34 78.37 L58.38 67.41 A2.5 2.5 0 0 1 58.38 63.87 Z"/><path fill="#a5b4fc" d="M38.23 -0.98 A2.5 2.5 0 0 1 41.77 -0.98 L52.73 9.98 A2.5 2.5 0 0 1 52.73 13.52 L41.77 24.48 A2.5 2.5 0 0 1 38.23 24.48 L27.27 13.52 A2.5 2.5 0 0 1 27.27 9.98 Z M10.27 43.52 A2.5 2.5 0 0 1 10.27 39.98 L13.98 36.27 A2.5 2.5 0 0 1 17.52 36.27 L38.23 56.98 A2.5 2.5 0 0 0 41.77 56.98 L62.48 36.27 A2.5 2.5 0 0 1 66.02 36.27 L69.73 39.98 A2.5 2.5 0 0 1 69.73 43.52 L41.77 71.48 A2.5 2.5 0 0 1 38.23 71.48 Z"/></svg>`;
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
                    backgroundColor: '#0f0e0d',
                    // Warm surface tint plus an accent bloom behind the wordmark, so
                    // the card is not a flat rectangle at thumbnail size.
                    backgroundImage:
                        'radial-gradient(900px 500px at 88% -8%, rgba(99,102,241,0.28), transparent 62%),' +
                        'radial-gradient(700px 460px at 4% 108%, rgba(26,23,21,0.95), transparent 70%)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img> only */}
                    <img src={MARK_DATA_URI} width={54} height={49} alt="" />
                    <div style={{ fontSize: 34, fontWeight: 600, color: '#f8fafc', letterSpacing: -0.5 }}>
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
                            color: '#f8fafc',
                        }}
                    >
                        {title}
                    </div>
                    <div style={{ marginTop: 28, fontSize: 27, lineHeight: 1.4, color: '#94a3b8' }}>
                        {description}
                    </div>
                </div>

                <div style={{ display: 'flex', height: 6, borderRadius: 3, backgroundColor: '#6366f1', width: 148 }} />
            </div>
        ),
        {
            ...OG_IMAGE_SIZE,
            fonts: [
                { name: 'Geist', data: await regular, weight: 400, style: 'normal' },
                { name: 'Geist', data: await semiBold, weight: 600, style: 'normal' },
            ],
        },
    );
}
