// AgiMate brand mark — the chevron stack, drawn in `currentColor` so callers set
// the colour with a text-* class (accent on the landing header, accent-foreground
// on the sidebar's tile). Geometry mirrors public/logo-mark.svg; keep them in sync.
export default function Logo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 75" className={className} fill="currentColor" aria-hidden="true">
      <path
        d="M38.23 1.77 A2.5 2.5 0 0 1 41.77 1.77 L52.73 12.73 A2.5 2.5 0 0 1 52.73 16.27 L41.77 27.23 A2.5 2.5 0 0 1 38.23 27.23 L27.27 16.27 A2.5 2.5 0 0 1 27.27 12.73 Z
           M19.6 32.75 A2.5 2.5 0 0 1 19.44 29.06 L23.79 24.71 A2.5 2.5 0 0 1 27.16 24.55 L38.4 33.92 A2.5 2.5 0 0 0 41.6 33.92 L52.84 24.55 A2.5 2.5 0 0 1 56.21 24.71 L60.56 29.06 A2.5 2.5 0 0 1 60.4 32.75 L41.6 48.42 A2.5 2.5 0 0 1 38.4 48.42 Z
           M10.6 48.75 A2.5 2.5 0 0 1 10.44 45.06 L14.79 40.71 A2.5 2.5 0 0 1 18.16 40.55 L38.4 57.42 A2.5 2.5 0 0 0 41.6 57.42 L61.84 40.55 A2.5 2.5 0 0 1 65.21 40.71 L69.56 45.06 A2.5 2.5 0 0 1 69.4 48.75 L41.6 71.92 A2.5 2.5 0 0 1 38.4 71.92 Z
           M9.16 56.55 A2.5 2.5 0 0 0 5.79 56.71 L0.73 61.77 A2.5 2.5 0 0 0 0 63.54 L0 72.5 A2.5 2.5 0 0 0 2.5 75 L24.39 75 A2.5 2.5 0 0 0 26 70.58 Z
           M70.84 56.55 A2.5 2.5 0 0 1 74.21 56.71 L79.27 61.77 A2.5 2.5 0 0 1 80 63.54 L80 72.5 A2.5 2.5 0 0 1 77.5 75 L55.61 75 A2.5 2.5 0 0 1 54 70.58 Z"
      />
    </svg>
  );
}
