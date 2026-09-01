import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';

// The brand typefaces, declared once and shared by every root layout — the
// locale one and the locale-less /app/auth. `next/font` keys its cache by the
// call site, so a second declaration would download and self-host the same
// files again under a second set of class names.
//
// `cyrillic` is not optional here: ru is the default locale and carries ~2000
// strings, so without it the primary language falls back to a system face.
// IBM Plex is not variable on Google Fonts, hence the explicit weight list —
// only the four the interface actually uses. Italic is real rather than
// synthesised: markdown `em` in chat renders it, and a slanted roman looks it.
export const brandSans = IBM_Plex_Sans({
  variable: '--font-brand-sans',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const brandMono = IBM_Plex_Mono({
  variable: '--font-brand-mono',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
});

/**
 * Both font variables, for the `className` of <html>.
 *
 * They belong on <html>, not on <body>. Tailwind declares `--font-sans` and
 * `--default-font-family` on `:root` — that is <html> — so a variable defined
 * one level lower on <body> is not in scope there: both resolve to the
 * guaranteed-invalid value and preflight quietly falls back to the system
 * stack. That is exactly what used to happen, which is why the typeface never
 * actually applied.
 */
export const brandFontVariables = `${brandSans.variable} ${brandMono.variable}`;
