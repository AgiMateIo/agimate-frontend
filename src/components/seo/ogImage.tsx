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

// public/logo-mark.svg with the fill inlined — satori resolves neither external
// files nor the stylesheet's prefers-color-scheme, and a card is always dark here.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 75"><path fill="#6366f1" d="M38.23 1.77 A2.5 2.5 0 0 1 41.77 1.77 L52.73 12.73 A2.5 2.5 0 0 1 52.73 16.27 L41.77 27.23 A2.5 2.5 0 0 1 38.23 27.23 L27.27 16.27 A2.5 2.5 0 0 1 27.27 12.73 Z M19.6 32.75 A2.5 2.5 0 0 1 19.44 29.06 L23.79 24.71 A2.5 2.5 0 0 1 27.16 24.55 L38.4 33.92 A2.5 2.5 0 0 0 41.6 33.92 L52.84 24.55 A2.5 2.5 0 0 1 56.21 24.71 L60.56 29.06 A2.5 2.5 0 0 1 60.4 32.75 L41.6 48.42 A2.5 2.5 0 0 1 38.4 48.42 Z M10.6 48.75 A2.5 2.5 0 0 1 10.44 45.06 L14.79 40.71 A2.5 2.5 0 0 1 18.16 40.55 L38.4 57.42 A2.5 2.5 0 0 0 41.6 57.42 L61.84 40.55 A2.5 2.5 0 0 1 65.21 40.71 L69.56 45.06 A2.5 2.5 0 0 1 69.4 48.75 L41.6 71.92 A2.5 2.5 0 0 1 38.4 71.92 Z M9.16 56.55 A2.5 2.5 0 0 0 5.79 56.71 L0.73 61.77 A2.5 2.5 0 0 0 0 63.54 L0 72.5 A2.5 2.5 0 0 0 2.5 75 L24.39 75 A2.5 2.5 0 0 0 26 70.58 Z M70.84 56.55 A2.5 2.5 0 0 1 74.21 56.71 L79.27 61.77 A2.5 2.5 0 0 1 80 63.54 L80 72.5 A2.5 2.5 0 0 1 77.5 75 L55.61 75 A2.5 2.5 0 0 1 54 70.58 Z"/></svg>`;
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
                    <img src={MARK_DATA_URI} width={52} height={49} alt="" />
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
